export type PaymentMethod = "efectivo" | "yape" | "plin" | "tarjeta" | "transferencia" | "reward" | "mixto";

export type PaymentSplit = {
  method: Exclude<PaymentMethod, "mixto">;
  amount: number;
  reference?: string | null;
};

export type ServiceOrderStatus = "registrado" | "pagado" | "anulado";
