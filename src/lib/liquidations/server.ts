import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLiquidationSnapshot } from "@/lib/production/calculate-liquidation";
import { parsePeruDateTime } from "@/lib/datetime/peru-time";

type Admin = SupabaseClient<any, "public", any>;

function money(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

function sum(rows: any[], selector: (row: any) => number) {
  return money(rows.reduce((total, row) => total + selector(row), 0));
}

export async function getLastClosedLiquidation(admin: Admin, barberId: string) {
  const { data } = await admin
    .from("barber_liquidations")
    .select("id,period_to,period_end,paid_at,approved_at,created_at")
    .eq("barber_id", barberId)
    .in("status", ["approved", "paid"])
    .order("period_end", { ascending: false, nullsFirst: false })
    .order("period_to", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function liquidatedProductionIds(admin: Admin, barberId: string) {
  const { data } = await admin
    .from("barber_liquidation_items")
    .select("production_entry_id,barber_liquidations!inner(status,barber_id)")
    .eq("barber_liquidations.barber_id", barberId)
    .neq("barber_liquidations.status", "cancelled")
    .not("production_entry_id", "is", null);
  return new Set((data ?? []).map((row: any) => row.production_entry_id).filter(Boolean));
}

export async function buildLiquidationPreview(admin: Admin, input: { from: string; to: string; barberId: string; branchId?: string | null }) {
  const lastClosed = await getLastClosedLiquidation(admin, input.barberId);
  const selectedStart = parsePeruDateTime(input.from, "00:00").toISOString();
  const selectedEnd = parsePeruDateTime(input.to, "23:59:59").toISOString();
  const periodStart = lastClosed?.period_end ? new Date(new Date(lastClosed.period_end).getTime() + 1).toISOString() : selectedStart;
  const periodEnd = selectedEnd;

  let query = admin
    .from("barber_production_entries")
    .select("*")
    .or(`barber_id.eq.${input.barberId},sold_by_employee_id.eq.${input.barberId}`)
    .is("voided_at", null)
    .gte("counted_at", periodStart)
    .lte("counted_at", periodEnd)
    .order("counted_at", { ascending: true });
  if (input.branchId && input.branchId !== "all") query = query.eq("branch_id", input.branchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const liquidatedIds = await liquidatedProductionIds(admin, input.barberId);
  const rows = (data ?? []).filter((row: any) => !liquidatedIds.has(row.id));
  const snapshot = calculateLiquidationSnapshot(rows);
  const debts = await getEmployeeDebtSummary(admin, { employeeId: input.barberId, branchId: input.branchId, from: periodStart, to: periodEnd });

  const totalBeforeDebts = money(snapshot.totalLiquidation);
  const debtApplied = money(debts.cafeteria.pending + debts.products.pending + debts.manual.pending);
  const netToPay = money(totalBeforeDebts - debtApplied);

  return {
    rows,
    periodStart,
    periodEnd,
    lastClosed,
    debts,
    summary: {
      grossProduction: snapshot.grossProduction,
      productionDeductions: snapshot.productionDeductions,
      calculatedProduction: snapshot.calculatedProduction,
      assignedPercentage: snapshot.assignedPercentage,
      serviceEarnings: snapshot.serviceEarnings,
      productCredits: snapshot.productCredits,
      bonuses: snapshot.bonuses,
      cafeteriaDebt: debts.cafeteria.pending,
      productDebt: debts.products.pending,
      manualDebt: debts.manual.pending,
      debtApplied,
      totalLiquidation: totalBeforeDebts,
      netToPay
    },
    snapshot: { ...snapshot, periodStart, periodEnd, debts, netToPay }
  };
}

export async function getEmployeeDebtSummary(admin: Admin, input: { employeeId?: string; branchId?: string | null; from?: string; to?: string }) {
  let query = admin
    .from("employee_benefit_movements")
    .select("*,employees!employee_benefit_movements_employee_id_fkey(id,first_name,last_name,branch_id,branches(name)),branches(name),creator:employees!employee_benefit_movements_created_by_fkey(first_name,last_name)")
    .eq("status", "active")
    .is("liquidated_at", null)
    .order("created_at", { ascending: false });
  if (input.employeeId) query = query.eq("employee_id", input.employeeId);
  if (input.branchId && input.branchId !== "all") query = query.eq("branch_id", input.branchId);
  if (input.from) query = query.gte("created_at", input.from);
  if (input.to) query = query.lte("created_at", input.to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []).filter((row: any) => row.payment_mode === "credit" || ["salary_advance", "manual_deduction", "manual_adjustment"].includes(row.movement_type));
  const cafeteriaRows = rows.filter((row: any) => row.movement_type === "cafeteria_credit");
  const productRows = rows.filter((row: any) => row.movement_type === "barber_product_credit");
  const manualRows = rows.filter((row: any) => ["salary_advance", "manual_deduction"].includes(row.movement_type));
  return {
    rows,
    cafeteria: { pending: sum(cafeteriaRows, (row) => row.total_amount), rows: cafeteriaRows },
    products: { pending: sum(productRows, (row) => row.total_amount), rows: productRows },
    manual: { pending: sum(manualRows, (row) => row.total_amount), rows: manualRows },
    totalPending: sum(rows, (row) => row.total_amount)
  };
}
