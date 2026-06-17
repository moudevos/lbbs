import { GET as rankingsGet } from "../../../rankings/route";
import { buildCsv, csvResponse } from "@/lib/reports/csv";

export async function GET(request: Request) {
  const response = await rankingsGet(request as any);
  if (response.status >= 400) return response;
  const data = await response.json();
  return csvResponse("reporte-rankings.csv", buildCsv(
    ["empleado", "servicios", "produccion_neta", "venta_barber_product", "creditos_productos"],
    (data.rankings ?? []).map((row: any) => [row.name, row.servicesCount, row.netProduction, row.barberProductSales, row.productCredits])
  ));
}
