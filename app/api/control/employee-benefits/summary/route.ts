import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";

export async function GET(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  let query = context.admin.from("employee_benefit_movements")
    .select("movement_type,total_amount,status").neq("status", "reversed");
  if (from) query = query.gte("created_at", `${from}T00:00:00.000-05:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999-05:00`);
  if (!from && !to) query = query.eq("benefit_month", `${month}-01`);
  const branchId = request.nextUrl.searchParams.get("branch_id");
  if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];
  const total = (types: string[]) => rows.filter((row) => types.includes(row.movement_type)).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  return NextResponse.json({
    cafeteriaCredit: total(["cafeteria_credit"]),
    productCredit: total(["barber_product_credit"]),
    advances: total(["salary_advance"]),
    deductions: total(["manual_deduction"]),
    freeHaircuts: rows.filter((row) => row.movement_type === "free_haircut").length,
    cashPaid: total(["cafeteria_cash", "barber_product_cash"]),
    pendingDeduction: total(["cafeteria_credit", "barber_product_credit", "salary_advance", "manual_deduction", "manual_adjustment"])
  });
}
