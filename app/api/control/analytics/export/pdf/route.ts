import { type NextRequest } from "next/server";
import { analyticsPayload } from "../../_utils";

export async function GET(request: NextRequest) {
  const result = await analyticsPayload(request);
  if (result.response) return result.response;
  const { jsPDF } = await import("jspdf");
  const payload = result.payload;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 42;
  doc.setFontSize(18);
  doc.text("La Bajadita Barber Studio", 42, y);
  y += 24;
  doc.setFontSize(11);
  doc.text(`Analisis operativo: ${result.filters.from} a ${result.filters.to}`, 42, y);
  y += 26;
  doc.setFontSize(9);
  doc.text("Nota: No incluye gastos ni egresos administrativos. No representa utilidad neta contable.", 42, y);
  y += 28;

  section(doc, "Resumen", [
    `Total cobrado: S/ ${money(payload.summary.totalCollected)}`,
    `Servicios: S/ ${money(payload.summary.servicesTotal)}`,
    `Productos: S/ ${money(payload.summary.productsTotal)}`,
    `Snacks / cafeteria: S/ ${money(payload.summary.snacksTotal)}`,
    `Atenciones: ${payload.summary.attentionCount}`,
    `Ticket promedio: S/ ${money(payload.summary.averageTicket)}`,
    `Remanente operativo estimado antes de gastos: S/ ${money(payload.summary.operationalRemainderBeforeExpenses)}`
  ], () => y, (next) => { y = next; });

  section(doc, "Top servicios", payload.services.slice(0, 5).map((row: any) => `${row.service}: S/ ${money(row.revenue)} (${row.quantity})`), () => y, (next) => { y = next; });
  section(doc, "Top barberos", payload.barbers.slice(0, 5).map((row: any) => `${row.barber}: S/ ${money(row.validProduction)} produccion valida`), () => y, (next) => { y = next; });
  section(doc, "Top productos", payload.products.slice(0, 5).map((row: any) => `${row.product}: S/ ${money(row.revenue)} margen est. S/ ${money(row.estimatedMargin)}`), () => y, (next) => { y = next; });
  section(doc, "Horarios pico", payload.peakHours.byHour.slice(0, 5).map((row: any) => `${row.label}: ${row.attentions} atenciones, S/ ${money(row.sales)}`), () => y, (next) => { y = next; });
  section(doc, "Hallazgos del periodo", payload.insights, () => y, (next) => { y = next; });

  const arrayBuffer = doc.output("arraybuffer");
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analisis-la-bajadita-${result.filters.from}-a-${result.filters.to}.pdf"`
    }
  });
}

function section(doc: any, title: string, lines: string[], getY: () => number, setY: (value: number) => void) {
  let y = getY();
  if (y > 690) {
    doc.addPage();
    y = 42;
  }
  doc.setFontSize(13);
  doc.text(title, 42, y);
  y += 18;
  doc.setFontSize(10);
  for (const line of lines.length ? lines : ["Sin datos"]) {
    doc.text(`- ${line}`, 52, y, { maxWidth: 500 });
    y += 15;
  }
  setY(y + 10);
}

function money(value: unknown) {
  return Number(value ?? 0).toFixed(2);
}
