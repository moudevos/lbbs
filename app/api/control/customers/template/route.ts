import { requireEmployee } from "@/lib/control/api";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  return xlsxResponse("plantilla-clientes.xlsx", "clientes", [
    {
      fullname: "Nombre Apellido",
      phone: "999999999",
      notes: "",
      sede: "Sin sede"
    }
  ]);
}
