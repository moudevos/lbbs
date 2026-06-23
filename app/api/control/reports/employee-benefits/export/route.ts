import { requireAdmin } from "@/lib/control/api";
import { xlsxResponse } from "@/lib/excel/export-xlsx";
import { benefitLabels } from "@/lib/employee-benefits/types";

export async function GET() {
  const context = await requireAdmin(); if (!context.ok) return context.error;
  const { data, error } = await context.admin.from("employee_benefit_movements")
    .select("*,employees!employee_benefit_movements_employee_id_fkey(first_name,last_name),creator:employees!employee_benefit_movements_created_by_fkey(first_name,last_name),branches(name),products(name)")
    .order("created_at", { ascending: false });
  if (error) return new Response(error.message, { status: 500 });
  return xlsxResponse("beneficios-empleados.xlsx", "beneficios", (data ?? []).map((row: any) => ({
    fecha: row.created_at, mes: row.benefit_month,
    empleado: `${row.employees?.first_name ?? ""} ${row.employees?.last_name ?? ""}`.trim(),
    sede: row.branches?.name ?? "", tipo: benefitLabels[row.movement_type] ?? row.movement_type,
    producto: row.products?.name ?? "", cantidad: row.quantity, total: row.total_amount,
    pago: row.payment_mode ?? "No aplica", metodo: row.payment_method ?? "", estado: row.status,
    registrado_por: `${row.creator?.first_name ?? ""} ${row.creator?.last_name ?? ""}`.trim(),
    motivo: row.reason ?? row.reversal_reason ?? ""
  })));
}
