import { requireAdmin } from "@/lib/control/api";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  return xlsxResponse("plantilla-servicios.xlsx", "servicios", [
    { nombre: "Corte clasico", descripcion: "Servicio base", duracion_minutos: 30, precio: 30, sede_codigo: "", global: "true", activo: "true" }
  ]);
}
