import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { writeAuditLog } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await writeAuditLog(createAdminClient(), {
      actorUserId: employee.userId,
      actorRole: employee.role,
      actorBranchId: employee.branchId,
      eventType: "login",
      tableName: "auth.users",
      recordId: employee.userId,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent")
    });
  } catch {
    return NextResponse.json({ ok: true, audited: false });
  }

  return NextResponse.json({ ok: true });
}
