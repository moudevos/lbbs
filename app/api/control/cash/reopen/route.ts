import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const { data: closure, error } = await context.admin
    .from("cash_closures").select("id,status,branch_id,closure_date").eq("id", body.closureId).maybeSingle();
  if (error || !closure) return NextResponse.json({ error: error?.message ?? "Cierre no encontrado" }, { status: 404 });
  const reopenedAt = new Date().toISOString();
  const { error: updateError } = await context.admin.from("cash_closures")
    .update({ status: "reopened", reopened_at: reopenedAt, reopened_by: context.employee.employeeId, notes: body.reason || null })
    .eq("id", closure.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "status_change", tableName: "cash_closures", recordId: closure.id,
    previousData: { status: closure.status }, newData: { event: "cash_reopened", status: "reopened", reason: body.reason || null, reopened_at: reopenedAt }
  });
  return NextResponse.json({ ok: true });
}
