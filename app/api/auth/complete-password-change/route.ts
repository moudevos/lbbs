import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { writeAuditLog } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("employees")
    .update({ must_change_password: false, onboarding_status: "active" })
    .eq("id", employee.employeeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorUserId: employee.userId,
    actorRole: employee.role,
    actorBranchId: employee.branchId,
    eventType: "update",
    tableName: "employees",
    recordId: employee.employeeId,
    previousData: { must_change_password: true },
    newData: { must_change_password: false, onboarding_status: "active" },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({ ok: true });
}
