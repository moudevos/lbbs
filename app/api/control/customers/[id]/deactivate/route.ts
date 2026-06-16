import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const patch = { is_active: false, deleted_at: new Date().toISOString(), deleted_by: context.employee.userId };
  const { error } = await context.admin.from("customers").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "delete",
    tableName: "customers",
    recordId: params.id,
    newData: patch
  });
  return NextResponse.json({ ok: true });
}
