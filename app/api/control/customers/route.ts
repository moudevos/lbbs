import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";
import { isValidPeruMobilePhone, normalizePhone } from "@/lib/customers/phone";
import { findOrCreateCustomerByPhone } from "@/lib/reservations/server";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");
  let query = context.admin.from("customers").select("id,phone,normalized_phone,full_name,notes,branch_id,is_active,created_at,branches(name),customer_visit_stats(total_visits,last_visit_at)").order("created_at", { ascending: false });
  const scope = resolveBranchScope(context.employee, branchId);
  if (context.employee.role === "admin" && scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  if (context.employee.role === "barbero") {
    const { data: reservations } = await context.admin.from("reservations").select("customer_id").eq("employee_id", context.employee.employeeId);
    const ids = [...new Set((reservations ?? []).map((row) => row.customer_id).filter(Boolean))];
    if (ids.length === 0) return NextResponse.json({ customers: [] });
    query = query.in("id", ids);
  }
  if (q) query = query.or(`phone.ilike.%${q}%,normalized_phone.ilike.%${normalizePhone(q)}%,full_name.ilike.%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const body = await request.json();
  if (!body.phone || !body.fullName) return NextResponse.json({ error: "Celular y nombre requeridos" }, { status: 400 });
  if (!isValidPeruMobilePhone(body.phone)) return NextResponse.json({ error: "Ingresa un celular peruano valido de 9 digitos" }, { status: 400 });
  const branchId = context.employee.role === "admin" ? body.branchId || context.employee.branchId : context.employee.branchId;
  if (!branchId) return NextResponse.json({ error: "Sede requerida" }, { status: 400 });
  const result = await findOrCreateCustomerByPhone({ admin: context.admin, phone: body.phone, fullName: body.fullName, branchId });
  if (result.error || !result.customer) return NextResponse.json({ error: result.error ?? "No se pudo resolver el cliente" }, { status: 500 });
  if (!result.created && result.nameDiffers) {
    return NextResponse.json({ error: "Ya existe un cliente con ese celular. Usa el registro existente para evitar duplicados." }, { status: 409 });
  }
  const patch = { notes: body.notes ?? null, branch_id: branchId };
  await context.admin.from("customers").update(patch).eq("id", result.customer.id);
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: result.created ? "create" : "update",
    tableName: "customers",
    recordId: result.customer.id,
    newData: { phone: body.phone, normalized_phone: result.normalizedPhone, full_name: body.fullName, ...patch, reused: !result.created }
  });
  return NextResponse.json({ customer: result.customer });
}
