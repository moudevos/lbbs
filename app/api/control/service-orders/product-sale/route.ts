import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";
import { isValidPeruMobilePhone, normalizePhone } from "@/lib/customers/phone";
import { requireEmployee } from "@/lib/control/api";
import { toPeruDate } from "@/lib/datetime/peru-time";
import { buildPaymentSplits, createServiceOrder, normalizeMoney, payServiceOrder, validatePaymentSplits } from "@/lib/service-orders/server";
import type { PaymentMethod, PaymentSplit } from "@/lib/service-orders/types";

const GENERIC_PHONE = "000000000";

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Barbero no registra venta rapida" }, { status: 403 });

  const body = await request.json();
  const branchId = context.employee.role === "admin" ? String(body.branchId ?? "") : context.employee.branchId;
  if (!branchId || branchId === "all") return NextResponse.json({ error: "Selecciona una sede antes de vender" }, { status: 400 });

  const today = toPeruDate();
  const { data: closedCash } = await context.admin
    .from("cash_closures")
    .select("id")
    .eq("branch_id", branchId)
    .eq("closure_date", today)
    .eq("status", "closed")
    .maybeSingle();
  if (closedCash?.id) {
    return NextResponse.json({ error: "La caja de esta sede ya esta cerrada para hoy" }, { status: 409 });
  }

  const customer = await resolveCustomerInput(context.admin, body.customer, branchId);
  if (customer.error) return NextResponse.json({ error: customer.error }, { status: 400 });

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
  const barberId = body.barberId ? String(body.barberId) : null;
  const payments = normalizePayments(body.payments);
  if ("error" in payments) return NextResponse.json({ error: payments.error }, { status: 400 });
  const paymentSplits = payments.splits;

  const result = await createServiceOrder({
    admin: context.admin,
    branchId,
    customerPhone: customer.phone,
    customerName: customer.name,
    employeeId: barberId,
    serviceId: null,
    total: 0,
    productItems: items.map((item: any) => ({
      productId: String(item.productId ?? ""),
      quantity: Number(item.quantity ?? 0),
      soldByEmployeeId: barberId
    })),
    observations: body.notes ?? null,
    origin: "walk_in",
    status: "pendiente_pago",
    serviceDate: today,
    orderType: "product_sale",
    productSellerFallbackId: null
  });

  if (result.error || !result.serviceOrderId) {
    return NextResponse.json({ error: result.error ?? "No se pudo registrar venta" }, { status: 500 });
  }

  const { data: order } = await context.admin
    .from("service_orders")
    .select("total")
    .eq("id", result.serviceOrderId)
    .maybeSingle();
  const total = normalizeMoney(order?.total ?? 0);
  const method = paymentSplits.length > 1 ? "mixto" : paymentSplits[0]?.method;
  const splitRows = method === "mixto" ? fitMixedSplitsToTotal(paymentSplits, total) : buildPaymentSplits(method as PaymentMethod, total);
  const validation = validatePaymentSplits(total, splitRows as PaymentSplit[]);
  if (validation) {
    await restoreProductStock(context.admin, result.serviceOrderId, branchId);
    await context.admin.from("service_order_items").delete().eq("service_order_id", result.serviceOrderId);
    await context.admin.from("service_orders").delete().eq("id", result.serviceOrderId);
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  const payResponse = await payServiceOrder(context.admin, result.serviceOrderId, method as PaymentMethod, splitRows as PaymentSplit[], context.employee.userId);
  const payData = await payResponse.json();
  if (!payResponse.ok) {
    await restoreProductStock(context.admin, result.serviceOrderId, branchId);
    await context.admin
      .from("service_orders")
      .update({ status: "anulado", voided_at: new Date().toISOString(), void_reason: payData.error ?? "Pago no registrado" })
      .eq("id", result.serviceOrderId);
    return NextResponse.json({ error: payData.error ?? "No se pudo registrar pago" }, { status: payResponse.status });
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "service_orders",
    recordId: result.serviceOrderId,
    newData: {
      event: "product_sale_created",
      branch_id: branchId,
      customer_created: result.customerCreated,
      customer_phone: customer.phone,
      barber_id: barberId,
      products: items,
      payments: paymentSplits,
      total
    }
  });

  return NextResponse.json({
    ok: true,
    orderId: result.serviceOrderId,
    ticketUrl: `/app/control/atenciones/${result.serviceOrderId}/ticket`,
    message: "Venta registrada correctamente"
  });
}

async function resolveCustomerInput(admin: any, input: any, branchId: string) {
  if (input?.id) {
    const { data, error } = await admin.from("customers").select("full_name,phone").eq("id", input.id).maybeSingle();
    if (error || !data) return { error: error?.message ?? "Cliente no encontrado" };
    return { phone: data.phone, name: data.full_name };
  }
  const phone = normalizePhone(String(input?.phone ?? ""));
  const name = String(input?.name ?? "").trim();
  if (!phone && name) return { error: "Para crear cliente ingresa celular. Si no tiene datos usa cliente generico." };
  if (!phone) return { phone: GENERIC_PHONE, name: "Cliente generico" };
  if (!isGenericCustomerPhone(phone) && !isValidPeruMobilePhone(phone)) return { error: "Ingresa un celular peruano valido de 9 digitos" };
  return { phone, name: isGenericCustomerPhone(phone) ? "Cliente generico" : name || `Cliente ${phone}` };
}

function normalizePayments(input: any): { splits: PaymentSplit[]; error?: never } | { error: string; splits?: never } {
  const rows = Array.isArray(input) ? input : [];
  const splits: PaymentSplit[] = [];
  for (const row of rows) {
    const method = normalizePaymentMethod(row.method);
    const amount = normalizeMoney(row.amount);
    if (!method || amount <= 0) continue;
    splits.push({ method, amount, reference: row.reference ?? null });
  }
  if (splits.length === 0) return { error: "Registra el pago de la venta" };
  return { splits };
}

function fitMixedSplitsToTotal(splits: PaymentSplit[], total: number) {
  const rows = splits.map((split) => ({ ...split, amount: normalizeMoney(split.amount) }));
  const paid = normalizeMoney(rows.reduce((sum, split) => sum + Number(split.amount ?? 0), 0));
  const diff = normalizeMoney(paid - total);
  const lastIndex = rows.length - 1;
  if (diff > 0 && lastIndex >= 0 && Number(rows[lastIndex].amount ?? 0) > diff) {
    rows[lastIndex].amount = normalizeMoney(Number(rows[lastIndex].amount) - diff);
  }
  return rows;
}

async function restoreProductStock(admin: any, serviceOrderId: string, branchId: string) {
  const { data: items } = await admin
    .from("service_order_items")
    .select("product_id,quantity")
    .eq("service_order_id", serviceOrderId)
    .eq("item_type", "product");
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const { data: stock } = await admin.from("product_branch_stock").select("stock_current").eq("product_id", item.product_id).eq("branch_id", branchId).maybeSingle();
    await admin.from("product_branch_stock").update({ stock_current: Number(stock?.stock_current ?? 0) + Number(item.quantity ?? 0) }).eq("product_id", item.product_id).eq("branch_id", branchId);
  }
}

function normalizePaymentMethod(method: string): Exclude<PaymentMethod, "mixto"> | "" {
  const map: Record<string, Exclude<PaymentMethod, "mixto">> = {
    cash: "efectivo",
    efectivo: "efectivo",
    qr: "yape",
    yape: "yape",
    plin: "plin",
    card: "tarjeta",
    tarjeta: "tarjeta",
    transfer: "transferencia",
    transferencia: "transferencia",
    reward: "reward"
  };
  return map[String(method ?? "").toLowerCase()] ?? "";
}
