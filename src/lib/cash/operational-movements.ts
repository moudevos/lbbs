import type { SupabaseClient } from "@supabase/supabase-js";
import { peruDayRange } from "@/lib/datetime/peru-time";

export type CashMethodBucket = "cash" | "card" | "qr" | "transfer";
export type CashOperationalPaymentMethod = "efectivo" | "tarjeta" | "qr" | "transferencia";

export type OperationalSummary = {
  total: number;
  byMethod: Record<CashMethodBucket, number>;
  count: number;
};

export function normalizeOperationalPaymentMethod(value: unknown): CashOperationalPaymentMethod | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["cash", "efectivo"].includes(raw)) return "efectivo";
  if (["card", "tarjeta"].includes(raw)) return "tarjeta";
  if (["qr", "yape", "plin"].includes(raw)) return "qr";
  if (["transfer", "transferencia"].includes(raw)) return "transferencia";
  return null;
}

export function operationalBucket(method: unknown): CashMethodBucket | null {
  const normalized = normalizeOperationalPaymentMethod(method);
  if (normalized === "efectivo") return "cash";
  if (normalized === "tarjeta") return "card";
  if (normalized === "qr") return "qr";
  if (normalized === "transferencia") return "transfer";
  return null;
}

export function emptyOperationalSummary(): OperationalSummary {
  return { total: 0, count: 0, byMethod: { cash: 0, card: 0, qr: 0, transfer: 0 } };
}

export function summarizeOperationalMovements(rows: Array<{ amount?: unknown; payment_method?: unknown }>): OperationalSummary {
  const summary = emptyOperationalSummary();
  for (const row of rows) {
    const amount = round(row.amount);
    const bucket = operationalBucket(row.payment_method);
    if (!bucket || amount <= 0) continue;
    summary.byMethod[bucket] = round(summary.byMethod[bucket] + amount);
    summary.total = round(summary.total + amount);
    summary.count += 1;
  }
  return summary;
}

export async function fetchActiveOperationalOuts(
  admin: SupabaseClient,
  {
    branchId,
    date,
    from,
    to
  }: {
    branchId?: string | null;
    date?: string | null;
    from?: string | null;
    to?: string | null;
  }
) {
  let range = { from, to };
  if (date) range = peruDayRange(date);
  if (!date && from && to && isDateOnly(from) && isDateOnly(to) && from === to) {
    range = peruDayRange(from);
  }
  let query = admin
    .from("cash_operational_movements")
    .select("id,branch_id,amount,payment_method,status,movement_type,direction,occurred_at")
    .eq("status", "active")
    .eq("direction", "out");

  if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
  if (range.from) query = query.gte("occurred_at", range.from);
  if (range.to) query = query.lte("occurred_at", range.to);

  const { data, error } = await query;
  return { data: data ?? [], error };
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function applyOperationalOutsToExpected(
  expected: Record<CashMethodBucket, number>,
  operationalOuts: OperationalSummary
) {
  return {
    cash: round(Number(expected.cash ?? 0) - operationalOuts.byMethod.cash),
    card: round(Number(expected.card ?? 0) - operationalOuts.byMethod.card),
    qr: round(Number(expected.qr ?? 0) - operationalOuts.byMethod.qr),
    transfer: round(Number(expected.transfer ?? 0) - operationalOuts.byMethod.transfer)
  };
}

export function round(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}
