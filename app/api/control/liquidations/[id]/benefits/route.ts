import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee(); if (!context.ok) return context.error;
  if (context.employee.role === "recepcion") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  if (context.employee.role === "barbero" && params.id !== context.employee.employeeId) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const { data, error } = await context.admin.from("employee_benefit_movements")
    .select("id,movement_type,total_amount,status,reason,notes,created_at,products(name)")
    .eq("employee_id", params.id).eq("benefit_month", `${month}-01`)
    .in("movement_type", ["cafeteria_credit", "barber_product_credit", "salary_advance", "manual_deduction", "manual_adjustment", "free_haircut"])
    .neq("status", "reversed").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];
  const deductible = rows.filter((row) => row.movement_type !== "free_haircut").reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  return NextResponse.json({ month, movements: rows, deductibleTotal: deductible });
}
