import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const orderSelect = "id,status,origin,subtotal,total,total_paid,balance,discount_amount,observations,created_at,attended_at,paid_at,voided_at,reservation_id,reservations(id,starts_at,ends_at,status),branches(id,name),customers(id,full_name,phone,customer_reward_accounts(*)),employees(id,first_name,last_name),services(id,name,sku),service_order_items(id,item_type,name,description,quantity,unit_price,discount_amount,amount,subtotal,product_id,service_id,sold_by_employee_id,seller_credit_amount,counts_for_seller_credit,products(id,name,sku,counts_for_seller_credit,seller_credit_amount)),payment_details(id,method,amount,reference),customer_reward_redemptions(*)";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  let { data, error } = await context.admin
    .from("service_orders")
    .select(orderSelect)
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Servicio no encontrado" }, { status: 404 });
  const row = data as any;
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  if (context.employee.role === "recepcion" && branch?.id !== context.employee.branchId) {
    return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });
  }
  if (context.employee.role === "barbero" && employee?.id !== context.employee.employeeId) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if ((row.service_order_items ?? []).length === 0 && row.reservation_id && !["pagado", "anulado"].includes(row.status)) {
    const repaired = await repairReservationOrderItem(context, row);
    if (repaired.error) return NextResponse.json({ serviceOrder: data, repairWarning: repaired.error });
    const refetch = await context.admin.from("service_orders").select(orderSelect).eq("id", params.id).maybeSingle();
    if (!refetch.error && refetch.data) data = refetch.data;
  }

  return NextResponse.json({ serviceOrder: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (body.observations !== undefined) patch.observations = body.observations;
  if (body.total !== undefined) patch.total = Number(body.total);

  const { error } = await context.admin.from("service_orders").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

async function repairReservationOrderItem(context: Awaited<ReturnType<typeof requireEmployee>> & { ok: true }, order: any) {
  const { data: reservation, error } = await context.admin
    .from("reservations")
    .select("id,branch_id,employee_id,service_id,price,services(name,price)")
    .eq("id", order.reservation_id)
    .maybeSingle();

  if (error || !reservation) return { error: error?.message ?? "No se pudo inferir item desde la reserva original" };
  if (!reservation.service_id || !reservation.employee_id || !reservation.branch_id) {
    return { error: "Reserva original incompleta: no se pudo reparar item principal" };
  }

  const service = Array.isArray(reservation.services) ? reservation.services[0] : reservation.services;
  const amount = Math.round(Number(order.subtotal ?? order.total ?? reservation.price ?? service?.price ?? 0) * 100) / 100;
  if (amount < 0) return { error: "Monto invalido para reparar item principal" };

  const { data: existing } = await context.admin
    .from("service_order_items")
    .select("id")
    .eq("service_order_id", order.id)
    .eq("service_id", reservation.service_id)
    .maybeSingle();
  if (existing?.id) return { repaired: false };

  const { data: inserted, error: insertError } = await context.admin
    .from("service_order_items")
    .insert({
      service_order_id: order.id,
      item_type: "service",
      service_id: reservation.service_id,
      name: service?.name ?? "Servicio",
      description: service?.name ?? "Servicio",
      quantity: 1,
      unit_price: amount,
      amount,
      subtotal: amount,
      barber_id: reservation.employee_id,
      branch_id: reservation.branch_id
    })
    .select("id")
    .single();
  if (insertError) return { error: insertError.message };

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "service_order_items",
    recordId: inserted.id,
    newData: {
      event: "service_order_item_repaired",
      service_order_id: order.id,
      reservation_id: reservation.id,
      service_id: reservation.service_id,
      amount
    }
  });

  return { repaired: true };
}
