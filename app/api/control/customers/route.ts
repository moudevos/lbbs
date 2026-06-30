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
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(request.nextUrl.searchParams.get("pageSize") ?? "25") || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = context.admin
    .from("customers")
    .select("id,phone,normalized_phone,full_name,notes,branch_id,is_active,created_at,branches(name),customer_visit_stats(total_visits,last_visit_at),customer_reward_accounts(available_rewards,earned_rewards,redeemed_rewards)", { count: "exact" })
    .order("created_at", { ascending: false });
  const scope = resolveBranchScope(context.employee, branchId);
  if (context.employee.role === "admin" && scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  if (context.employee.role === "barbero") {
    const { data: reservations } = await context.admin.from("reservations").select("customer_id").eq("employee_id", context.employee.employeeId);
    const ids = [...new Set((reservations ?? []).map((row) => row.customer_id).filter(Boolean))];
    if (ids.length === 0) return NextResponse.json({ customers: [], total: 0, page, pageSize });
    query = query.in("id", ids);
  }
  if (q) query = query.or(`phone.ilike.%${q}%,normalized_phone.ilike.%${normalizePhone(q)}%,full_name.ilike.%${q}%`);
  const { data, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const customerIds = (data ?? []).map((customer) => customer.id);
  const { data: paidOrders } = customerIds.length
    ? await context.admin.from("service_orders").select("customer_id,attended_at").in("customer_id", customerIds).eq("status", "pagado")
    : { data: [] };
  const liveStats = new Map<string, { total: number; last: string | null }>();
  for (const order of paidOrders ?? []) {
    if (!order.customer_id) continue;
    const current = liveStats.get(order.customer_id) ?? { total: 0, last: null };
    current.total += 1;
    if (!current.last || new Date(order.attended_at).getTime() > new Date(current.last).getTime()) current.last = order.attended_at;
    liveStats.set(order.customer_id, current);
  }
  return NextResponse.json({
    customers: (data ?? []).map((customer: any) => {
      const stored = Array.isArray(customer.customer_visit_stats) ? customer.customer_visit_stats[0] : customer.customer_visit_stats;
      const live = liveStats.get(customer.id);
      return { ...customer, customer_visit_stats: [{ ...stored, total_visits: live?.total ?? Number(stored?.total_visits ?? 0), last_visit_at: live?.last ?? stored?.last_visit_at ?? null }] };
    }),
    total: count ?? 0,
    page,
    pageSize
  });
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
