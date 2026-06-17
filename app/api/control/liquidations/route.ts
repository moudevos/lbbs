import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { calculateLiquidationSnapshot } from "@/lib/production/calculate-liquidation";

function sum(rows: any[], key: string) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

async function buildLiquidation(admin: any, from: string, to: string, barberId: string, branchId?: string | null) {
  let query = admin
    .from("barber_production_entries")
    .select("*")
    .or(`barber_id.eq.${barberId},sold_by_employee_id.eq.${barberId}`)
    .is("voided_at", null)
    .gte("counted_at", `${from}T00:00:00.000Z`)
    .lte("counted_at", `${to}T23:59:59.999Z`)
    .order("counted_at", { ascending: true });
  if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const snapshot = calculateLiquidationSnapshot(rows);
  return {
    rows,
    summary: {
      grossProduction: snapshot.grossProduction,
      productionDeductions: snapshot.productionDeductions,
      calculatedProduction: snapshot.calculatedProduction,
      assignedPercentage: snapshot.assignedPercentage,
      serviceEarnings: snapshot.serviceEarnings,
      productCredits: snapshot.productCredits,
      bonuses: snapshot.bonuses,
      totalLiquidation: snapshot.totalLiquidation
    },
    snapshot
  };
}

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
    const result = await buildLiquidation(context.admin, from, to, barberId, branchId);
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
    const result = await buildLiquidation(context.admin, body.from, body.to, body.barberId, body.branchId);
    const payload = {
      period_from: body.from,
      period_to: body.to,
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
