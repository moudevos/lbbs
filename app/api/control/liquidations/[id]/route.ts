import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

const allowed = ["approved", "paid", "cancelled"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const status = String(body.status ?? "");
  if (!allowed.includes(status)) return NextResponse.json({ error: "Estado invalido" }, { status: 400 });

  const { data: previous } = await context.admin.from("barber_liquidations").select("*").eq("id", params.id).maybeSingle();
  if (!previous) return NextResponse.json({ error: "Liquidacion no encontrada" }, { status: 404 });
  if (previous.status === "paid") return NextResponse.json({ error: "Liquidacion pagada es inmutable" }, { status: 409 });
  if (previous.status === "approved" && status !== "paid" && status !== "cancelled") {
    return NextResponse.json({ error: "Liquidacion aprobada no se recalcula ni modifica automaticamente" }, { status: 409 });
  }
  const patch = {
    status,
    approved_by: status === "approved" ? context.employee.userId : previous?.approved_by ?? null,
    approved_at: status === "approved" ? new Date().toISOString() : previous?.approved_at ?? null,
    paid_by: status === "paid" ? context.employee.userId : previous?.paid_by ?? null,
    paid_at: status === "paid" ? new Date().toISOString() : previous?.paid_at ?? null
  };
  const { error } = await context.admin.from("barber_liquidations").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, { actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId, eventType: "status_change", tableName: "barber_liquidations", recordId: params.id, previousData: previous, newData: patch });
  return NextResponse.json({ ok: true });
}
