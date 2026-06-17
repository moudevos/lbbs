import { money } from "./calculate-barber-production";

export type ProductionEntrySnapshot = {
  id: string;
  entry_type: string;
  gross_amount: number;
  deduction_amount: number;
  production_amount: number;
  percentage: number;
  barber_earning: number;
  description?: string | null;
  counted_at?: string | null;
};

export function calculateLiquidationSnapshot(entries: ProductionEntrySnapshot[]) {
  const services = entries.filter((entry) => entry.entry_type === "service");
  const products = entries.filter((entry) => entry.entry_type === "product_credit");
  const bonuses = entries.filter((entry) => entry.entry_type === "bonus");
  const sum = (rows: ProductionEntrySnapshot[], key: keyof ProductionEntrySnapshot) =>
    money(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0));

  return {
    grossProduction: sum(services, "gross_amount"),
    productionDeductions: sum(services, "deduction_amount"),
    calculatedProduction: sum(services, "production_amount"),
    assignedPercentage: Number(services[0]?.percentage ?? 0),
    serviceEarnings: sum(services, "barber_earning"),
    productCredits: sum(products, "barber_earning"),
    bonuses: sum(bonuses, "barber_earning"),
    totalLiquidation: money(sum(services, "barber_earning") + sum(products, "barber_earning") + sum(bonuses, "barber_earning")),
    cutoffAt: new Date().toISOString(),
    items: entries.map((entry) => ({
      productionEntryId: entry.id,
      itemType: entry.entry_type,
      description: entry.description ?? null,
      grossAmount: money(entry.gross_amount),
      deductionAmount: money(entry.deduction_amount),
      productionAmount: money(entry.production_amount),
      percentage: Number(entry.percentage ?? 0),
      earningAmount: money(entry.barber_earning),
      countedAt: entry.counted_at ?? null
    }))
  };
}
