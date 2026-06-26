import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { getEmployeeDebtSummary } from "@/lib/liquidations/server";

export async function GET(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const employeeId = request.nextUrl.searchParams.get("employee_id") ?? undefined;
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? undefined;
  const fromDate = request.nextUrl.searchParams.get("from");
  const toDate = request.nextUrl.searchParams.get("to");
  const from = fromDate ? `${fromDate}T00:00:00.000-05:00` : undefined;
  const to = toDate ? `${toDate}T23:59:59.999-05:00` : undefined;
  try {
    const summary = await getEmployeeDebtSummary(context.admin, { employeeId, branchId, from, to });
    const byEmployee = new Map<string, any>();
    for (const row of summary.rows) {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
      const key = row.employee_id;
      const current = byEmployee.get(key) ?? {
        employeeId: key,
        employeeName: employee ? `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() : "Empleado",
        branchName: branch?.name ?? employee?.branches?.name ?? "Sin sede",
        cafeteriaDebt: 0,
        productDebt: 0,
        manualDebt: 0,
        totalPending: 0,
        rows: []
      };
      const amount = Number(row.total_amount ?? 0);
      if (row.movement_type === "cafeteria_credit") current.cafeteriaDebt += amount;
      else if (row.movement_type === "barber_product_credit") current.productDebt += amount;
      else current.manualDebt += amount;
      current.totalPending += amount;
      current.rows.push(row);
      byEmployee.set(key, current);
    }
    return NextResponse.json({
      metrics: {
        totalPending: summary.totalPending,
        cafeteriaPending: summary.cafeteria.pending,
        productPending: summary.products.pending,
        manualPending: summary.manual.pending,
        employeesWithDebt: byEmployee.size
      },
      employees: [...byEmployee.values()].sort((a, b) => b.totalPending - a.totalPending),
      rows: summary.rows
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar deudas" }, { status: 500 });
  }
}
