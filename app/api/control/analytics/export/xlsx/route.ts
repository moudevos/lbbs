import { type NextRequest } from "next/server";
import { analyticsPayload } from "../../_utils";
import { rowsToMultiSheetWorkbookBuffer } from "@/lib/excel/create-workbook";

export async function GET(request: NextRequest) {
  const result = await analyticsPayload(request);
  if (result.response) return result.response;
  const payload = result.payload;
  const from = result.filters.from;
  const to = result.filters.to;
  const buffer = rowsToMultiSheetWorkbookBuffer([
    { name: "Resumen", rows: objectRows(payload.summary) },
    { name: "Ventas por dia", rows: payload.salesByDay },
    { name: "Metodos de pago", rows: payload.paymentMethods },
    { name: "Servicios", rows: payload.services },
    { name: "Barberos", rows: payload.barbers },
    { name: "Productos", rows: payload.products },
    { name: "Clientes", rows: payload.customers.rows },
    { name: "Horarios pico", rows: [...payload.peakHours.byDay, ...payload.peakHours.byHour] },
    { name: "Movimientos detalle", rows: payload.movements }
  ]);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analisis-la-bajadita-${from}-a-${to}.xlsx"`
    }
  });
}

function objectRows(input: Record<string, any>) {
  return Object.entries(input).map(([metrica, valor]) => ({
    metrica,
    valor: typeof valor === "object" ? JSON.stringify(valor) : valor
  }));
}
