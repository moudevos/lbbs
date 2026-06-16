import { NextResponse, type NextRequest } from "next/server";
import type { AppRole } from "@/lib/auth/types";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateEmployeeBody = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: AppRole;
  branchId?: string | null;
};

async function nextEmployeeCode(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from("employees").select("code").like("code", "EMP-%").order("code", { ascending: false }).limit(1);
  const lastCode = data?.[0]?.code;
  const lastNumber = lastCode ? Number.parseInt(lastCode.replace("EMP-", ""), 10) : 0;
  return `EMP-${String(Number.isFinite(lastNumber) ? lastNumber + 1 : 1).padStart(3, "0")}`;
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentEmployee();

  if (!actor || actor.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<CreateEmployeeBody>;

  if (!body.email || !body.firstName || !body.lastName || !body.role) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  if (!["admin", "recepcion", "barbero"].includes(body.role)) {
    return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const temporaryPassword = generateTemporaryPassword();
  const { data: createdUser, error: userError } = await admin.auth.admin.createUser({
    email: body.email,
    password: temporaryPassword,
    email_confirm: false,
    user_metadata: {
      first_name: body.firstName,
      last_name: body.lastName,
      role: body.role
    }
  });

  if (userError || !createdUser.user) {
    return NextResponse.json({ error: userError?.message ?? "No se pudo crear usuario" }, { status: 500 });
  }

  const code = await nextEmployeeCode(admin);
  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      code,
      user_id: createdUser.user.id,
      branch_id: body.branchId ?? null,
      role: body.role,
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone ?? null,
      email: body.email,
      must_change_password: true,
      onboarding_status: "pending_email_verification",
      email_confirmed_at: null,
      is_active: true
    })
    .select("id,code")
    .single();

  if (employeeError) {
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }

  await writeAuditLog(admin, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    actorBranchId: actor.branchId,
    eventType: "create",
    tableName: "employees",
    recordId: employee.id,
    newData: { code, email: body.email, role: body.role, branch_id: body.branchId ?? null },
    ipAddress: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent")
  });

  return NextResponse.json({
    employeeId: employee.id,
    code: employee.code,
    authUserId: createdUser.user.id,
    temporaryPassword
    ,
    emailVerificationRequired: true
  });
}
