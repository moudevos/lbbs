export type ProductionServiceInput = {
  grossAmount: number;
  percentage: number;
};

export type ProductCreditInput = {
  category?: string | null;
  quantity: number;
  countsForSellerCredit?: boolean | null;
  sellerCreditAmount?: number | null;
};

export function money(value: unknown) {
  return Math.max(Math.round(Number(value ?? 0) * 100) / 100, 0);
}

export function calculateServiceProduction({ grossAmount, percentage }: ProductionServiceInput) {
  const gross = money(grossAmount);
  const deductionAmount = Math.min(gross > 60 ? 10 : 2, gross);
  const productionAmount = money(gross - deductionAmount);
  const appliedPercentage = Math.max(Number(percentage ?? 0), 0);
  return {
    grossAmount: gross,
    deductionAmount,
    discountRule: gross > 60 ? "gross_gt_60_minus_10" : "gross_lte_60_minus_2",
    productionAmount,
    percentage: appliedPercentage,
    barberEarning: money((productionAmount * appliedPercentage) / 100)
  };
}

export function calculateProductSellerCredit(input: ProductCreditInput) {
  const isBarberProduct = input.category === "barber_product" || Boolean(input.countsForSellerCredit);
  const quantity = Math.max(Number(input.quantity ?? 0), 0);
  const creditPerUnit = isBarberProduct ? money(input.sellerCreditAmount ?? 2) : 0;
  const productionAmount = money(quantity * creditPerUnit);
  return {
    countsForSellerCredit: isBarberProduct,
    quantity,
    creditPerUnit,
    productionAmount,
    barberEarning: productionAmount
  };
}
