import { requireEmployee } from "@/lib/control/api";
import { buildCsv, csvResponse } from "@/lib/reports/csv";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  let query = context.admin.from("barber_liquidations").select("*,employees(first_name,last_name),branches(name)").order("period_from", { ascending: false });
  if (context.employee.role === "barbero") query = query.eq("barber_id", context.employee.employeeId);
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });
  return csvResponse("reporte-liquidaciones.csv", buildCsv(
    ["periodo_desde", "periodo_hasta", "barbero", "sede", "produccion_bruta", "deducciones", "produccion_neta", "porcentaje", "ganancia_servicios", "creditos_productos", "bonos", "total_pagar", "estado"],
    (data ?? []).map((row: any) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
      return [row.period_from, row.period_to, `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim(), branch?.name, row.gross_production, row.production_deductions, row.calculated_production, row.assigned_percentage, row.service_earnings, row.product_credits, row.bonuses, row.total_liquidation, row.status];
    })
  ));
}
