import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { buildLiquidationPreview } from "@/lib/liquidations/server";

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const today = new Date().toISOString().slice(0, 10);
  const from = request.nextUrl.searchParams.get("from") ?? today;
  const to = request.nextUrl.searchParams.get("to") ?? today;
  const barberId = request.nextUrl.searchParams.get("barber_id") ?? (context.employee.role === "barbero" ? context.employee.employeeId : "");
  const branchId = request.nextUrl.searchParams.get("branch_id") ?? request.nextUrl.searchParams.get("branchId");

  if (!barberId) return NextResponse.json({ error: "Barbero requerido" }, { status: 400 });
  if (context.employee.role === "barbero" && barberId !== context.employee.employeeId) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  try {
    const result = await buildLiquidationPreview(context.admin, { from, to, barberId, branchId });
    const { data: drafts } = await context.admin
      .from("barber_liquidations")
      .select("*")
      .eq("barber_id", barberId)
      .eq("period_from", from)
      .eq("period_to", to)
      .order("created_at", { ascending: false });
    return NextResponse.json({ ...result, liquidations: drafts ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo calcular" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role !== "admin") return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  const body = await request.json();
  if (!body.from || !body.to || !body.barberId) return NextResponse.json({ error: "Periodo y barbero requeridos" }, { status: 400 });

  try {
    const result = await buildLiquidationPreview(context.admin, { from: body.from, to: body.to, barberId: body.barberId, branchId: body.branchId });
    const payload = {
      period_from: body.from,
      period_to: body.to,
      period_start: result.periodStart,
      period_end: result.periodEnd,
      branch_id: body.branchId && body.branchId !== "all" ? body.branchId : null,
      barber_id: body.barberId,
      gross_production: result.summary.grossProduction,
      production_deductions: result.summary.productionDeductions,
      calculated_production: result.summary.calculatedProduction,
      assigned_percentage: result.summary.assignedPercentage,
      service_earnings: result.summary.serviceEarnings,
      product_credits: result.summary.productCredits,
      bonuses: result.summary.bonuses,
      total_liquidation: result.summary.totalLiquidation,
      service_commission: result.summary.serviceEarnings,
      product_incentives: result.summary.productCredits,
      cafeteria_debt_total: result.summary.cafeteriaDebt,
      cafeteria_debt_applied: result.summary.cafeteriaDebt,
      product_debt_total: result.summary.productDebt,
      product_debt_applied: result.summary.productDebt,
      manual_deduction_total: result.summary.manualDebt,
      manual_deduction_applied: result.summary.manualDebt,
      net_to_pay: result.summary.netToPay,
      status: "draft",
      created_by: context.employee.userId,
      cutoff_at: result.snapshot.cutoffAt,
      snapshot: result.snapshot
    };
    const { data, error } = await context.admin.from("barber_liquidations").insert(payload).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (result.rows.length) {
      await context.admin.from("barber_liquidation_items").insert(result.rows.map((row: any) => ({
        liquidation_id: data.id,
        production_entry_id: row.id,
        item_type: row.entry_type,
        description: row.description,
        gross_amount: row.gross_amount,
        deduction_amount: row.deduction_amount,
        production_amount: row.production_amount,
        percentage: row.percentage,
        earning_amount: row.barber_earning
        ,
        discount_rule: row.gross_amount > 60 ? "gross_gt_60_minus_10" : "gross_lte_60_minus_2",
        applied_percentage: row.percentage,
        snapshot: result.snapshot.items.find((item) => item.productionEntryId === row.id) ?? {}
      })));
    }
    await writeAuditLog(context.admin, { actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId, eventType: "create", tableName: "barber_liquidations", recordId: data.id, newData: payload });
    return NextResponse.json({ liquidationId: data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo generar" }, { status: 500 });
  }
}
