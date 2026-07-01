import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { buildAnalyticsPayload, getAnalyticsDataset, normalizeAnalyticsFilters } from "@/lib/analytics/analytics-calculations";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const params = new URLSearchParams(request.nextUrl.searchParams);
  const date = params.get("date");
  if (date) {
    params.set("from", date);
    params.set("to", date);
  }
  params.set("status", params.get("status") || "all");
  const filters = normalizeAnalyticsFilters(params, context.employee);
  const result = await getAnalyticsDataset(context.admin, filters);
  if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "No se pudo cargar caja" }, { status: 500 });

  const payload = buildAnalyticsPayload(result.data);
  const summary = payload.summary;
  const pendingTickets = result.data.orders.filter((order: any) => ["registrado", "pendiente_pago"].includes(order.status));
  const byMethod = payload.paymentMethods;

  return NextResponse.json({
    ok: true,
    date: filters.from,
    branchId: filters.branchId,
    summary,
    paymentMethods: summary.paymentMethods,
    movements: payload.movements,
    grossTotal: summary.totalSold + pendingTickets.reduce((sum: number, order: any) => sum + Number(order.total ?? 0), 0),
    totalSold: summary.totalCollected,
    pendingTotal: pendingTickets.reduce((sum: number, order: any) => sum + Number(order.balance ?? order.total ?? 0), 0),
    voidedTotal: summary.voidedTotal,
    attentionCount: summary.attentionCount,
    serviceGross: summary.servicesTotal,
    serviceCount: summary.serviceUnits,
    serviceDeductionTotal: summary.serviceDeductionTotal,
    serviceProduction: summary.estimatedBarberProduction,
    estimatedServiceBarberEarnings: summary.estimatedBarberProduction,
    productTotal: summary.productsTotal,
    snackTotal: summary.snacksTotal,
    snackCount: payload.products.filter((row: any) => row.category === "snack").reduce((sum: number, row: any) => sum + Number(row.quantitySold ?? 0), 0),
    barberProductTotal: summary.productsTotal,
    barberProductCount: payload.products.filter((row: any) => row.category !== "snack").reduce((sum: number, row: any) => sum + Number(row.quantitySold ?? 0), 0),
    sellerCredits: 0,
    voidedCount: summary.voidedCount,
    byMethod,
    byOrigin: [],
    byBarber: [],
    tickets: payload.movements,
    pendingTickets
  });
}
