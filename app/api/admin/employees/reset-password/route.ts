import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

type ResetPasswordBody = {
  employeeId: string;
};

export async function POST(request: NextRequest) {
  const actor = await getCurrentEmployee();

  if (!actor || actor.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<ResetPasswordBody>;

  if (!body.employeeId) {
    return NextResponse.json({ error: "employeeId requerido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id,user_id,email")
    .eq("id", body.employeeId)
    .maybeSingle();

  if (employeeError || !employee?.user_id) {
    return NextResponse.json({ error: employeeError?.message ?? "Empleado sin usuario vinculado" }, { status: 404 });
  }

  const temporaryPassword = generateTemporaryPassword();
  const { error: authError } = await admin.auth.admin.updateUserById(employee.user_id, {
    password: temporaryPassword
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("employees")
    .update({ must_change_password: true })
    .eq("id", employee.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: "update",
    tableName: "employees",
    recordId: employee.id,
    newData: { reset_password: true, must_change_password: true },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({
    employeeId: employee.id,
    email: employee.email,
    temporaryPassword
  });
}
