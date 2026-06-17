import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const { error } = await context.admin
    .from("products")
    .update({ is_active: false, deleted_at: new Date().toISOString(), deleted_by: context.employee.userId })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "delete",
    tableName: "products",
    recordId: params.id,
    newData: { is_active: false }
  });

  return NextResponse.json({ ok: true });
}
