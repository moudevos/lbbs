export type RealtimeEventType = string;

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
  const labels: Record<string, string> = {
    reservation_created: "Nueva reserva",
    reservation_status_changed: "Reserva actualizada",
    reservation_confirmed: "Reserva confirmada",
    service_order_created: "Atencion creada",
    service_order_pending_payment: "Pendiente de cobro",
    service_order_paid: "Atencion pagada",
    service_order_voided: "Atencion anulada",
    stock_changed: "Stock actualizado",
    cash_closed: "Cierre de caja",
    notification_event: "Notificacion operativa"
  };
  return labels[type] ?? "Notificacion operativa";
}
