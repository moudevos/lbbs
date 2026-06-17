import { requireAdmin } from "@/lib/control/api";
import { buildCsv, csvResponse } from "@/lib/reports/csv";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  return csvResponse("plantilla-servicios.csv", buildCsv(
    ["nombre", "descripcion", "duracion_minutos", "precio", "sede_codigo", "global", "activo"],
    [["Corte clasico", "Servicio base", 30, 30, "", "true", "true"]]
  ));
}
