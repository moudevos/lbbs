import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { isValidPeruMobilePhone } from "@/lib/customers/phone";
import { createServiceOrder, missingAttentionItemsMessage, normalizeMoney } from "@/lib/service-orders/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toPeruDate } from "@/lib/datetime/peru-time";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function authenticate(request: NextRequest) {
  const token = request.headers.get("x-local-token") ?? "";
  if (!token) return { error: NextResponse.json({ error: "Token local requerido" }, { status: 401 }) };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("local_devices")
    .select("id,branch_id,status")
    .eq("access_token_hash", hash(token))
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return { error: NextResponse.json({ error: "Token local invalido" }, { status: 403 }) };
  await admin.from("local_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { admin, device: data };
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const genericCustomer = isGenericCustomerPhone(body.customerPhone);
  if (genericCustomer) body.customerName = "Cliente generico";
  const hasService = Boolean(body.serviceId);
  const hasProducts = Array.isArray(body.productItems) && body.productItems.length > 0;

  if (!body.customerPhone || !body.customerName || !body.employeeId) {
    return NextResponse.json({ error: "Cliente y barbero son requeridos" }, { status: 400 });
  }
  if (!hasService && !hasProducts) {
    return NextResponse.json({ error: missingAttentionItemsMessage }, { status: 400 });
  }
  if (!genericCustomer && !isValidPeruMobilePhone(body.customerPhone)) {
    return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  }

  const result = await createServiceOrder({
    admin: auth.admin,
    branchId: auth.device.branch_id,
    customerPhone: body.customerPhone,
    customerName: body.customerName,
    employeeId: body.employeeId,
    serviceId: body.serviceId || null,
    total: normalizeMoney(body.total),
    additions: [],
    productItems: body.productItems ?? [],
    observations: body.observations ?? null,
    origin: "local_device",
    status: "pendiente_pago",
    serviceDate: toPeruDate()
  });

  if (result.error || !result.serviceOrderId) {
    return NextResponse.json({ error: result.error ?? "No se pudo registrar atencion local" }, { status: 500 });
  }

  if (body.customDescription && body.serviceId) {
    await auth.admin.from("service_order_items")
      .update({ name: "Personalizado", description: String(body.customDescription).trim() })
      .eq("service_order_id", result.serviceOrderId)
      .eq("service_id", body.serviceId);
  }

  for (const serviceId of Array.isArray(body.additionalServiceIds) ? body.additionalServiceIds : []) {
    const { data: service } = await auth.admin.from("services").select("id,name,price,branch_id,is_active").eq("id", serviceId).maybeSingle();
    if (!service?.is_active || (service.branch_id && service.branch_id !== auth.device.branch_id)) continue;
    const amount = normalizeMoney(service.price);
    await auth.admin.from("service_order_items").insert({
      service_order_id: result.serviceOrderId,
      item_type: "service",
      service_id: service.id,
      name: service.name,
      description: service.name,
      quantity: 1,
      unit_price: amount,
      discount_amount: 0,
      seller_credit_amount: 0,
      counts_for_seller_credit: false,
      stock_controlled: false,
      amount,
      subtotal: amount,
      barber_id: body.employeeId,
      branch_id: auth.device.branch_id
    });
    const { data: current } = await auth.admin.from("service_orders").select("subtotal,total,discount_amount").eq("id", result.serviceOrderId).single();
    const subtotal = normalizeMoney(Number(current?.subtotal ?? 0) + amount);
    const total = normalizeMoney(Math.max(subtotal - Number(current?.discount_amount ?? 0), 0));
    await auth.admin.from("service_orders").update({ subtotal, total, balance: total }).eq("id", result.serviceOrderId);
  }

  for (const courtesyType of Array.isArray(body.courtesyItems) ? body.courtesyItems : []) {
    await auth.admin.from("service_order_items").insert({
      service_order_id: result.serviceOrderId,
      item_type: "courtesy",
      name: courtesyType,
      description: `Cortesia: ${courtesyType}`,
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      seller_credit_amount: 0,
      counts_for_seller_credit: false,
      amount: 0,
      subtotal: 0,
      branch_id: auth.device.branch_id,
      courtesy_type: courtesyType,
      stock_controlled: false
    });
  }

  await writeAuditLog(auth.admin, {
    eventType: "create",
    tableName: "service_orders",
    recordId: result.serviceOrderId,
    newData: {
      source: "local_device",
      device_id: auth.device.id,
      branch_id: auth.device.branch_id,
      customer_created: result.customerCreated
    }
  });

  return NextResponse.json({ serviceOrderId: result.serviceOrderId, redirectTo: "/local/agenda" });
}
