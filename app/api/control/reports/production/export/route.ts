import { GET as productionGet } from "../../../production/route";
import { buildCsv, csvResponse } from "@/lib/reports/csv";

export async function GET(request: Request) {
  const response = await productionGet(request as any);
  if (response.status >= 400) return response;
  const data = await response.json();
  return csvResponse("reporte-produccion.csv", buildCsv(
    ["fecha", "empleado", "sede", "tipo", "item", "bruto", "deduccion", "produccion", "porcentaje", "ganancia"],
    (data.rows ?? []).map((row: any) => [row.counted_at, row.barberName ?? row.sellerName, row.branchName, row.entry_type, row.description, row.gross_amount, row.deduction_amount, row.production_amount, row.percentage, row.barber_earning])
  ));
}
