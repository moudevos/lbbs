import { GET as productionGet } from "../../../production/route";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET(request: Request) {
  const response = await productionGet(request as any);
  if (response.status >= 400) return response;
  const data = await response.json();
  return xlsxResponse("reporte-produccion.xlsx", "produccion", (data.rows ?? []).map((row: any) => ({
    fecha: row.counted_at,
    empleado: row.barberName ?? row.sellerName,
    sede: row.branchName,
    tipo: row.entry_type,
    item: row.description,
    bruto: row.gross_amount,
    deduccion: row.deduction_amount,
    produccion: row.production_amount,
    porcentaje: row.percentage,
    ganancia: row.barber_earning
  })));
}
