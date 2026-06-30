import { NextResponse, type NextRequest } from "next/server";
import { buildAnalyticsPayload, getAnalyticsDataset, normalizeAnalyticsFilters } from "@/lib/analytics/analytics-calculations";
import { requireAdmin } from "@/lib/control/api";

export async function analyticsPayload(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return { response: context.error };
  const filters = normalizeAnalyticsFilters(request.nextUrl.searchParams, context.employee);
  const result = await getAnalyticsDataset(context.admin, filters);
  if (result.error || !result.data) {
    return { response: NextResponse.json({ error: result.error ?? "No se pudo cargar analisis" }, { status: 500 }) };
  }
  return { context, filters, payload: buildAnalyticsPayload(result.data) };
}
