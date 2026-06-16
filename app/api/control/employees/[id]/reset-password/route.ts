import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const { data: employee, error } = await context.admin.from("employees").select("id,user_id,email").eq("id", params.id).maybeSingle();
  if (error || !employee?.user_id) return NextResponse.json({ error: error?.message ?? "Empleado sin usuario" }, { status: 404 });
  const temporaryPassword = generateTemporaryPassword();
  const auth = await context.admin.auth.admin.updateUserById(employee.user_id, { password: temporaryPassword });
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: 500 });
  await context.admin.from("employees").update({ must_change_password: true }).eq("id", params.id);
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "employees",
    recordId: params.id,
    newData: { reset_password: true, must_change_password: true }
  });
  return NextResponse.json({ temporaryPassword, email: employee.email });
}
