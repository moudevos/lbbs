import { GET as rankingsGet } from "../../../rankings/route";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET(request: Request) {
  const response = await rankingsGet(request as any);
  if (response.status >= 400) return response;
  const data = await response.json();
  return xlsxResponse("reporte-rankings.xlsx", "rankings", (data.rankings ?? []).map((row: any) => ({
    empleado: row.name,
    servicios: row.servicesCount,
    produccion_neta: row.netProduction,
    venta_barber_product: row.barberProductSales,
    creditos_productos: row.productCredits
  })));
}
