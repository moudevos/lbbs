export type RealtimeEventType =
  | "reservation_created"
  | "reservation_status_changed"
  | "reservation_confirmed"
  | "service_order_created"
  | "service_order_pending_payment"
  | "service_order_paid"
  | "service_order_voided"
  | "stock_changed"
  | "sync_error";

export type RealtimeNotification = {
  id: string;
  type: RealtimeEventType;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
  read?: boolean;
};

export function eventTitle(type: RealtimeEventType) {
  const labels: Record<RealtimeEventType, string> = {
    reservation_created: "Nueva reserva",
    reservation_status_changed: "Reserva actualizada",
    reservation_confirmed: "Reserva confirmada",
    service_order_created: "Atencion creada",
    service_order_pending_payment: "Pendiente de cobro",
    service_order_paid: "Atencion pagada",
    service_order_voided: "Atencion anulada",
    stock_changed: "Stock actualizado",
    sync_error: "Error de sincronizacion"
  };
  return labels[type];
}
