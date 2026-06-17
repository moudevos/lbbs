import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { writeAuditLog } from "@/lib/audit";
import { createServiceOrder, normalizeMoney } from "@/lib/service-orders/server";
import { isValidPeruMobilePhone } from "@/lib/customers/phone";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const from = searchParams.get("from") ?? date ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? date ?? from;
  const branchId = searchParams.get("branch_id");
  const barberId = searchParams.get("barber_id");
  const status = searchParams.get("status");

  let query = context.admin
    .from("service_orders")
    .select("id,status,origin,subtotal,total,total_paid,balance,discount_amount,attended_at,created_at,paid_at,voided_at,branches(name),customers(full_name,phone,customer_reward_accounts(available_rewards,earned_rewards,redeemed_rewards)),employees(first_name,last_name),services(name,sku),service_order_items(item_type,name,description,quantity,unit_price,subtotal,products(name,sku)),payment_details(method,amount,reference)")
    .gte("attended_at", `${from}T00:00:00`)
    .lte("attended_at", `${to}T23:59:59`)
    .order("attended_at", { ascending: false });

  const scope = resolveBranchScope(context.employee, branchId);
  if (context.employee.role === "admin") {
    if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  } else if (context.employee.role === "recepcion") {
    query = query.eq("branch_id", context.employee.branchId);
  } else {
    query = query.eq("employee_id", context.employee.employeeId);
  }
  if (barberId) query = query.eq("employee_id", barberId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ serviceOrders: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Barbero no registra ventas" }, { status: 403 });

  const body = await request.json();
  const branchId = context.employee.role === "admin" ? body.branchId : context.employee.branchId;
  const hasService = Boolean(body.serviceId);
  const hasProducts = Array.isArray(body.productItems) && body.productItems.length > 0;
  if (!branchId || !body.customerPhone || !body.customerName || !body.employeeId || (!hasService && !hasProducts)) {
    return NextResponse.json({ error: "Sede, cliente, barbero y al menos un servicio o producto son requeridos" }, { status: 400 });
  }
  if (!isValidPeruMobilePhone(body.customerPhone)) {
    return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  }

  const result = await createServiceOrder({
    admin: context.admin,
    branchId,
    customerPhone: body.customerPhone,
    customerName: body.customerName,
    employeeId: body.employeeId,
    serviceId: body.serviceId || null,
    total: normalizeMoney(body.total),
    additions: body.additions ?? [],
    productItems: body.productItems ?? [],
    observations: body.observations ?? null
  });

  if (result.error || !result.serviceOrderId) {
    return NextResponse.json({ error: result.error ?? "No se pudo registrar servicio" }, { status: 500 });
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "service_orders",
    recordId: result.serviceOrderId,
    newData: { branch_id: branchId, total: body.total, customer_created: result.customerCreated, products: body.productItems ?? [] }
  });

  if ((body.productItems ?? []).length > 0) {
    await writeAuditLog(context.admin, {
      actorUserId: context.employee.userId,
      actorRole: context.employee.role,
      actorBranchId: context.employee.branchId,
      eventType: "update",
      tableName: "product_stock_movements",
      recordId: result.serviceOrderId,
      newData: { service_order_id: result.serviceOrderId, products_sold: body.productItems }
    });
  }

  return NextResponse.json(result);
}
