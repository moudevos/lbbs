import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { buildLiquidationPreview } from "@/lib/liquidations/server";

function num(value: unknown) {
  return Math.max(Number(value ?? 0), 0);
}

function money(value: unknown) {
  return Math.max(Math.round(Number(value ?? 0) * 100) / 100, 0);
}

function rowsWithAssignedPercentage(rows: any[], assignedPercentage: number) {
  return rows.map((row) => {
    if (String(row.entry_type ?? "") !== "service") return row;
    const productionAmount = money(row.production_amount);
    return {
      ...row,
      percentage: assignedPercentage,
      barber_earning: money((productionAmount * assignedPercentage) / 100)
    };
  });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  if (!body.from || !body.to || !body.barberId) return NextResponse.json({ error: "Periodo y barbero requeridos" }, { status: 400 });
  try {
    const result = await buildLiquidationPreview(context.admin, { from: body.from, to: body.to, barberId: body.barberId, branchId: body.branchId });
    const cafeteriaApplied = Math.min(num(body.cafeteriaDebtApplied ?? result.summary.cafeteriaDebt), result.summary.cafeteriaDebt);
    const productApplied = Math.min(num(body.productDebtApplied ?? result.summary.productDebt), result.summary.productDebt);
    const manualApplied = Math.min(num(body.manualDebtApplied ?? result.summary.manualDebt), result.summary.manualDebt);
    const assignedPercentage = body.assignedPercentage === undefined ? result.summary.assignedPercentage : num(body.assignedPercentage);
    const liquidationRows = rowsWithAssignedPercentage(result.rows, assignedPercentage);
    const serviceEarnings = money(liquidationRows.filter((row) => String(row.entry_type ?? "") === "service").reduce((total, row) => total + Number(row.barber_earning ?? 0), 0));
    const productCredits = money(liquidationRows.filter((row) => String(row.entry_type ?? "") === "product_credit").reduce((total, row) => total + Number(row.barber_earning ?? 0), 0));
    const bonuses = money(result.summary.bonuses);
    const totalLiquidation = money(serviceEarnings + productCredits + bonuses);
    const netToPay = totalLiquidation - cafeteriaApplied - productApplied - manualApplied;
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
      assigned_percentage: assignedPercentage,
      service_earnings: serviceEarnings,
      product_credits: productCredits,
      bonuses: result.summary.bonuses,
      total_liquidation: totalLiquidation,
      service_commission: serviceEarnings,
      product_incentives: productCredits,
      cafeteria_debt_total: result.summary.cafeteriaDebt,
      cafeteria_debt_applied: cafeteriaApplied,
      product_debt_total: result.summary.productDebt,
      product_debt_applied: productApplied,
      manual_deduction_total: result.summary.manualDebt,
      manual_deduction_applied: manualApplied,
      net_to_pay: netToPay,
      status: "paid",
      created_by: context.employee.userId,
      approved_by: context.employee.userId,
      approved_at: new Date().toISOString(),
      paid_by: context.employee.userId,
      paid_at: new Date().toISOString(),
      snapshot: { ...result.snapshot, assignedPercentageOverride: assignedPercentage, recalculatedRows: liquidationRows, appliedDebts: { cafeteriaApplied, productApplied, manualApplied }, notes: body.notes ?? null }
    };
    const { data, error } = await context.admin.from("barber_liquidations").insert(payload).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (liquidationRows.length) {
      await context.admin.from("barber_liquidation_items").insert(liquidationRows.map((row: any) => ({
        liquidation_id: data.id,
        production_entry_id: row.id,
        item_type: row.entry_type,
        description: row.description,
        gross_amount: row.gross_amount,
        deduction_amount: row.deduction_amount,
        production_amount: row.production_amount,
        percentage: row.percentage,
        earning_amount: row.barber_earning,
        discount_rule: row.gross_amount > 60 ? "gross_gt_60_minus_10" : "gross_lte_60_minus_2",
        applied_percentage: row.percentage,
        snapshot: result.snapshot.items?.find((item: any) => item.productionEntryId === row.id) ?? {}
      })));
      await context.admin.from("service_orders").update({ liquidation_id: data.id }).in("id", liquidationRows.map((row: any) => row.service_order_id).filter(Boolean));
      await context.admin.from("service_order_items").update({ liquidation_id: data.id }).in("id", liquidationRows.map((row: any) => row.service_order_item_id).filter(Boolean));
    }

    const debtRows = [
      ...result.debts.cafeteria.rows,
      ...result.debts.products.rows,
      ...result.debts.manual.rows
    ];
    if (debtRows.length) {
      await context.admin.from("employee_benefit_movements").update({
        related_liquidation_id: data.id,
        liquidation_id: data.id,
        liquidated_at: new Date().toISOString(),
        status: "liquidated"
      }).in("id", debtRows.map((row: any) => row.id));
    }

    await writeAuditLog(context.admin, {
      actorUserId: context.employee.userId,
      actorRole: context.employee.role,
      actorBranchId: context.employee.branchId,
      eventType: "status_change",
      tableName: "barber_liquidations",
      recordId: data.id,
      newData: payload
    });
    return NextResponse.json({ liquidationId: data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cerrar liquidacion" }, { status: 500 });
  }
}
