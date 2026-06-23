export const employeeBenefitTypes = [
  "free_haircut", "cafeteria_cash", "cafeteria_credit",
  "barber_product_cash", "barber_product_credit",
  "salary_advance", "manual_deduction", "manual_adjustment"
] as const;

export type EmployeeBenefitType = typeof employeeBenefitTypes[number];

export const benefitLabels: Record<string, string> = {
  free_haircut: "Corte gratis",
  cafeteria_cash: "Cafeteria pagada",
  cafeteria_credit: "Cafeteria a credito",
  barber_product_cash: "Producto pagado",
  barber_product_credit: "Producto a credito",
  salary_advance: "Adelanto",
  manual_deduction: "Descuento manual",
  manual_adjustment: "Ajuste manual",
  reversal: "Reversion"
};
