import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const patch = { is_active: false, deleted_at: new Date().toISOString(), deleted_by: context.employee.userId };
  const { error } = await context.admin.from("services").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "delete",
    tableName: "services",
    recordId: params.id,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}
