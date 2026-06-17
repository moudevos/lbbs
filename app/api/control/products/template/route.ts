import { requireAdmin } from "@/lib/control/api";
import { xlsxResponse } from "@/lib/excel/export-xlsx";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  return xlsxResponse("plantilla-productos.xlsx", "productos", [
    {
      nombre: "Pomada",
      descripcion: "Producto de barberia",
      categoria: "barber_product",
      precio_venta: 25,
      costo: 12,
      sede_codigo: "SED-001",
      stock_inicial: 10,
      stock_minimo: 2,
      cuenta_credito_vendedor: "true",
      credito_vendedor: 2,
      activo: "true"
    }
  ]);
}
