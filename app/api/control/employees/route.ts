import { NextResponse, type NextRequest } from "next/server";
import type { AppRole } from "@/lib/auth/types";
import { requireEmployee, requireAdmin } from "@/lib/control/api";
import { nextCode } from "@/lib/control/codes";
import { generateTemporaryPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const role = request.nextUrl.searchParams.get("role");
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");
  let query = context.admin
    .from("employees")
    .select("id,user_id,code,first_name,last_name,nickname,specialty,profile_photo_path,profile_photo_url,production_percentage,can_perform_services,phone,email,role,branch_id,is_active,must_change_password,onboarding_status,email_confirmed_at,branches(name)")
    .order("code");
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  const scope = resolveBranchScope(context.employee, branchId);
  if (context.employee.role === "admin" && scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (role) query = query.eq("role", role);
  if (q) {
    const textFilters = `code.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,nickname.ilike.%${q}%,specialty.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`;
    const normalizedRole = normalizeEmployeeRoleSearch(q);
    query = normalizedRole ? query.or(`${textFilters},role.eq.${normalizedRole}`) : query.or(textFilters);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const employees = await Promise.all((data ?? []).map(async (employee) => ({
    ...employee,
    profile_photo_url: await resolvePublicImageUrl({
      admin: context.admin,
      bucket: "employee-avatars",
      path: employee.profile_photo_path,
      fallback: employee.profile_photo_url
    })
  })));
  return NextResponse.json({ employees });
}

function normalizeEmployeeRoleSearch(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "admin" || normalized === "recepcion" || normalized === "barbero") return normalized;
  return "";
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  const role = body.role as AppRole;
  const createUser = role === "barbero" ? false : Boolean(body.createUser);
  if (!body.firstName || !body.lastName || !role) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  if ((role === "recepcion" || role === "barbero") && !body.branchId) return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
  if (createUser && !body.email) return NextResponse.json({ error: "Email requerido para usuario" }, { status: 400 });
  const code = await nextCode(context.admin, "employees", "code", "EMP", 3);
  let userId: string | null = null;
  let temporaryPassword: string | null = null;
  if (createUser) {
    temporaryPassword = generateTemporaryPassword();
    const created = await context.admin.auth.admin.createUser({
      email: body.email,
      password: temporaryPassword,
      email_confirm: false,
      user_metadata: { role, first_name: body.firstName, last_name: body.lastName }
    });
    if (created.error || !created.data.user) {
      return NextResponse.json({ error: created.error?.message ?? "No se pudo crear usuario" }, { status: 500 });
    }
    userId = created.data.user.id;
  }
  const payload = {
    code,
    user_id: userId,
    branch_id: body.branchId || null,
    role,
    first_name: body.firstName,
    last_name: body.lastName,
    phone: body.phone ?? null,
    email: body.email ?? null,
    nickname: body.nickname ?? null,
    specialty: body.specialty ?? null,
    production_percentage: Number(body.productionPercentage ?? 50),
    can_perform_services: role === "barbero" ? true : Boolean(body.canPerformServices),
    must_change_password: Boolean(userId),
    onboarding_status: userId ? "pending_email_verification" : "active",
    email_confirmed_at: null,
    is_active: true
  };
  const { data, error } = await context.admin.from("employees").insert(payload).select("id,code").single();
  if (error) {
    if (userId) await context.admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "employees",
    recordId: data.id,
    newData: { ...payload, temporaryPassword: undefined }
  });
  return NextResponse.json({ employee: data, temporaryPassword, emailVerificationRequired: Boolean(userId) });
}
