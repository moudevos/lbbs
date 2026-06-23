import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  const month = request.nextUrl.searchParams.get("month");
  const branchId = request.nextUrl.searchParams.get("branch_id");
  const employeeId = request.nextUrl.searchParams.get("employee_id");
  const type = request.nextUrl.searchParams.get("type");
  const status = request.nextUrl.searchParams.get("status");
  let query = context.admin.from("employee_benefit_movements")
    .select("*,employees!employee_benefit_movements_employee_id_fkey(first_name,last_name),creator:employees!employee_benefit_movements_created_by_fkey(first_name,last_name),branches(name),products(name,sku)")
    .order("created_at", { ascending: false });
  if (month) query = query.eq("benefit_month", `${month}-01`);
  if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
  if (employeeId && employeeId !== "all") query = query.eq("employee_id", employeeId);
  if (type && type !== "all") query = query.eq("movement_type", type);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ movements: data ?? [] });
}
