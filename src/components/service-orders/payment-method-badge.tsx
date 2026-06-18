import type { PaymentMethod } from "@/lib/service-orders/types";

const labels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  reward: "Reward",
  mixto: "Mixto"
};

export function PaymentMethodBadge({ method }: { method: PaymentMethod | string }) {
  return (
    <span className="rounded-md border border-[var(--border-soft)] bg-black/40 px-2 py-1 text-xs text-[var(--gold-soft)]">
      {labels[method as PaymentMethod] ?? method}
    </span>
  );
}
