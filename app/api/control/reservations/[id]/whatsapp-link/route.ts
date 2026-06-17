import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const body = await request.json().catch(() => ({}));
  const { data: reservation, error } = await context.admin
    .from("reservations")
    .select("id,status,branch_id,customer_id,customers(full_name,phone)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !reservation) return NextResponse.json({ error: error?.message ?? "Reserva no encontrada" }, { status: 404 });
  if (context.employee.role === "recepcion" && reservation.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Fuera de tu sede" }, { status: 403 });
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "reservations",
    recordId: params.id,
    newData: { event: "whatsapp_link_generated", status: body.status ?? null, templateKey: body.templateKey ?? null },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  if (reservation.status === "pendiente") {
    const { error: updateError } = await context.admin
      .from("reservations")
      .update({ status: "contactado" })
      .eq("id", params.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    await writeAuditLog(context.admin, {
      actorUserId: context.employee.userId,
      actorRole: context.employee.role,
      actorBranchId: context.employee.branchId,
      eventType: "status_change",
      tableName: "reservations",
      recordId: params.id,
      previousData: { status: "pendiente" },
      newData: { status: "contactado", reason: "whatsapp_link_generated" },
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent")
    });
  }

  return NextResponse.json({ ok: true });
}
