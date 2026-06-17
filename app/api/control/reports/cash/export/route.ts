import { GET as summaryGet } from "../../../cash/summary/route";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET(request: Request) {
  const response = await summaryGet(request as any);
  if (response.status >= 400) return response;
  const data = await response.json();
  const rows = [
    ["bruto_total", data.grossTotal],
    ["total_cobrado", data.totalSold],
    ["pendiente", data.pendingTotal],
    ["anulado", data.voidedTotal],
    ["servicios_bruto", data.serviceGross],
    ["deducciones", data.productionDeductions],
    ["produccion_neta", data.serviceProduction],
    ["snacks", data.snackTotal],
    ["productos_barberia", data.barberProductTotal],
    ["creditos_vendedores", data.sellerCredits]
  ];
  return xlsxResponse("reporte-caja.xlsx", "caja", rows.map(([metrica, valor]) => ({ metrica, valor })));
}
