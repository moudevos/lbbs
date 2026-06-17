import { requireEmployee } from "@/lib/control/api";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  let query = context.admin.from("barber_liquidations").select("*,employees(first_name,last_name),branches(name)").order("period_from", { ascending: false });
  if (context.employee.role === "barbero") query = query.eq("barber_id", context.employee.employeeId);
  if (context.employee.role === "recepcion") query = query.eq("branch_id", context.employee.branchId);
  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });
  return xlsxResponse("reporte-liquidaciones.xlsx", "liquidaciones", (data ?? []).map((row: any) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
      return { periodo_desde: row.period_from, periodo_hasta: row.period_to, barbero: `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim(), sede: branch?.name, produccion_bruta: row.gross_production, deducciones: row.production_deductions, produccion_neta: row.calculated_production, porcentaje: row.assigned_percentage, ganancia_servicios: row.service_earnings, creditos_productos: row.product_credits, bonos: row.bonuses, total_pagar: row.total_liquidation, estado: row.status };
    }));
}
