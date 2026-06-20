import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso para cambiar el barbero" }, { status: 403 });

  const body = await request.json();
  const employeeId = String(body.employeeId ?? "");
  const reason = String(body.reason ?? "").trim();
  if (!employeeId) return NextResponse.json({ error: "Selecciona el nuevo barbero" }, { status: 400 });

  const { data: order, error: orderError } = await context.admin
    .from("service_orders").select("id,status,branch_id,employee_id").eq("id", params.id).maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: orderError?.message ?? "Atencion no encontrada" }, { status: 404 });
  if (context.employee.role === "recepcion" && order.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "La atencion pertenece a otra sede" }, { status: 403 });
  }
  if (order.status === "anulado") return NextResponse.json({ error: "No se puede modificar una atencion anulada" }, { status: 409 });
  if (order.status === "pagado" && context.employee.role !== "admin") {
    return NextResponse.json({ error: "Solo admin puede corregir una atencion pagada" }, { status: 403 });
  }
  if (order.status === "pagado" && !reason) {
    return NextResponse.json({ error: "El motivo es obligatorio para corregir una atencion pagada" }, { status: 400 });
  }

  const { data: barber, error: barberError } = await context.admin
    .from("employees").select("id,branch_id,role,is_active,first_name,last_name").eq("id", employeeId).maybeSingle();
  if (barberError || !barber || barber.role !== "barbero" || !barber.is_active) {
    return NextResponse.json({ error: barberError?.message ?? "Barbero activo no encontrado" }, { status: 400 });
  }
  if (barber.branch_id && barber.branch_id !== order.branch_id) {
    return NextResponse.json({ error: "El barbero no pertenece a la sede de la atencion" }, { status: 400 });
  }
  if (order.employee_id === employeeId) return NextResponse.json({ ok: true, unchanged: true });

  const changedAt = new Date().toISOString();
  const { error: updateError } = await context.admin
    .from("service_orders").update({ employee_id: employeeId, updated_at: changedAt }).eq("id", params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: itemsError } = await context.admin
    .from("service_order_items").update({ barber_id: employeeId }).eq("service_order_id", params.id)
    .in("item_type", ["service", "custom_service", "manual_extra"]);
  if (itemsError) {
    await context.admin.from("service_orders").update({ employee_id: order.employee_id }).eq("id", params.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "service_orders",
    recordId: params.id,
    previousData: { employee_id: order.employee_id },
    newData: {
      event: order.status === "pagado" ? "paid_order_barber_override" : "barber_reassigned",
      employee_id: employeeId,
      barber_name: `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim(),
      reason: reason || null,
      changed_at: changedAt
    }
  });
  return NextResponse.json({ ok: true });
}
