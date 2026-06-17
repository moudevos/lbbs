import { requireAdmin } from "@/lib/control/api";
import { buildCsv, csvResponse } from "@/lib/reports/csv";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  return csvResponse("plantilla-empleados.csv", buildCsv(
    ["nombre", "apellido", "email", "celular", "rol", "sede_codigo", "apodo", "especialidad", "puede_realizar_servicios", "porcentaje_produccion", "activo"],
    [["Juan", "Perez", "juan@example.com", "999999999", "barbero", "SED-001", "JP", "Cortes clasicos", "true", 50, "true"]]
  ));
}
