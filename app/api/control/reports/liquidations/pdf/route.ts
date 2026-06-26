import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { buildLiquidationPreview } from "@/lib/liquidations/server";
import { formatPeruDateTime } from "@/lib/datetime/peru-time";

function money(value: unknown) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const barberId = request.nextUrl.searchParams.get("barber_id") ?? (context.employee.role === "barbero" ? context.employee.employeeId : "");
  const branchId = request.nextUrl.searchParams.get("branch_id");
  if (!from || !to || !barberId) return NextResponse.json({ error: "Periodo y barbero requeridos" }, { status: 400 });
  if (context.employee.role === "barbero" && barberId !== context.employee.employeeId) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const assignedPercentage = Number(request.nextUrl.searchParams.get("assigned_percentage") ?? 0);
  const productApplied = Number(request.nextUrl.searchParams.get("product_debt_applied") ?? NaN);
  const manualApplied = Number(request.nextUrl.searchParams.get("manual_debt_applied") ?? NaN);
  const result = await buildLiquidationPreview(context.admin, { from, to, barberId, branchId });
  const percentage = assignedPercentage > 0 ? assignedPercentage : Number(result.summary.assignedPercentage ?? 0);
  const rows = result.rows.map((row: any) => {
    if (row.entry_type !== "service") return row;
    const earning = Math.max(Math.round((Number(row.production_amount ?? 0) * percentage) / 100 * 100) / 100, 0);
    return { ...row, percentage, barber_earning: earning };
  });
  const serviceEarnings = rows.filter((row: any) => row.entry_type === "service").reduce((sum: number, row: any) => sum + Number(row.barber_earning ?? 0), 0);
  const productCredits = rows.filter((row: any) => row.entry_type === "product_credit").reduce((sum: number, row: any) => sum + Number(row.barber_earning ?? 0), 0);
  const grossIncome = serviceEarnings + productCredits + Number(result.summary.bonuses ?? 0);
  const cafeteria = Number(result.summary.cafeteriaDebt ?? 0);
  const productDebt = Number.isFinite(productApplied) ? Math.min(productApplied, Number(result.summary.productDebt ?? 0)) : Number(result.summary.productDebt ?? 0);
  const manualDebt = Number.isFinite(manualApplied) ? Math.min(manualApplied, Number(result.summary.manualDebt ?? 0)) : Number(result.summary.manualDebt ?? 0);
  const discountTotal = cafeteria + productDebt + manualDebt;
  const netToPay = grossIncome - discountTotal;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 42;
  const left = 40;
  const line = (text: string, x = left, size = 10, weight: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    doc.text(text, x, y);
    y += size + 8;
  };
  const rowLine = (columns: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    columns.forEach((value, index) => doc.text(String(value).slice(0, index === 1 ? 32 : 18), left + [0, 78, 260, 330, 405, 485][index], y));
    y += 14;
    if (y > 760) {
      doc.addPage();
      y = 42;
    }
  };

  doc.setFillColor(12, 12, 12);
  doc.rect(0, 0, pageWidth, 92, "F");
  doc.setTextColor(255, 215, 0);
  line("LA BAJADITA BARBER STUDIO", left, 14, "bold");
  doc.setTextColor(255, 255, 255);
  line("Sustento de liquidacion", left, 18, "bold");
  doc.setTextColor(0, 0, 0);
  y = 118;
  line(`Periodo: ${from} al ${to}`, left, 11, "bold");
  line(`Periodo real: ${formatPeruDateTime(result.periodStart)} - ${formatPeruDateTime(result.periodEnd)}`, left, 9);
  line(`Porcentaje asignado: ${percentage.toFixed(2)}%`, left, 9);
  line(`Emitido: ${formatPeruDateTime(new Date())}`, left, 9);

  y += 8;
  line("Resumen", left, 12, "bold");
  line(`Ingresos: ${money(grossIncome)}   |   Descuentos: ${money(discountTotal)}   |   Neto a pagar: ${money(netToPay)}`, left, 11, "bold");
  line(`Servicios: ${money(serviceEarnings)}   Productos: ${money(productCredits)}   Bonos: ${money(result.summary.bonuses)}`, left, 9);
  line(`Snacks: ${money(cafeteria)}   Productos deuda: ${money(productDebt)}   Manuales: ${money(manualDebt)}`, left, 9);

  y += 10;
  line("Detalle de ingresos", left, 12, "bold");
  rowLine(["Fecha", "Descripcion", "Bruto", "Produccion", "%", "Ganancia"]);
  rows.forEach((row: any) => rowLine([
    formatPeruDateTime(row.counted_at),
    row.description ?? row.entry_type,
    money(row.gross_amount),
    money(row.production_amount),
    `${Number(row.percentage ?? 0).toFixed(2)}%`,
    money(row.barber_earning)
  ]));

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="liquidacion-${from}-${to}.pdf"`
    }
  });
}
