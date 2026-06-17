"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeNotification } from "./realtime-events";
import { eventTitle } from "./realtime-events";

type SubscribeInput = {
  branchId?: string | null;
  onEvent: (notification: RealtimeNotification) => void;
  onStatus?: (status: "connecting" | "synced" | "error") => void;
  onError?: (message: string) => void;
};

function channelName(branchId?: string | null) {
  return branchId && branchId !== "all" ? `branch:${branchId}:ops` : "branch:all:ops";
}

function branchFilter(branchId?: string | null) {
  return branchId && branchId !== "all" ? `branch_id=eq.${branchId}` : undefined;
}

function notify(type: RealtimeNotification["type"], message: string, href?: string): RealtimeNotification {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title: eventTitle(type),
    message,
    href,
    createdAt: new Date().toISOString(),
    read: false
  };
}

export function subscribeToOperationalRealtime({ branchId, onEvent, onStatus, onError }: SubscribeInput) {
  const supabase = createClient();
  const channel: RealtimeChannel = supabase.channel(channelName(branchId));
  const filter = branchFilter(branchId);
  onStatus?.("connecting");

  channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations", filter }, (payload) => {
    const row = payload.new as any;
    onEvent(notify("reservation_created", `Reserva ${row.status ?? ""} creada.`, "/app/control/reservas"));
    if (row.status === "confirmado") onEvent(notify("reservation_confirmed", "Reserva confirmada disponible en agenda local.", "/app/control/agenda"));
  });

  channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "reservations", filter }, (payload) => {
    const row = payload.new as any;
    const previous = payload.old as any;
    if (row.status !== previous.status) {
      onEvent(notify(row.status === "confirmado" ? "reservation_confirmed" : "reservation_status_changed", `Reserva cambio a ${row.status}.`, "/app/control/reservas"));
    }
  });

  channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "service_orders", filter }, (payload) => {
    const row = payload.new as any;
    onEvent(notify(row.status === "pendiente_pago" ? "service_order_pending_payment" : "service_order_created", `Atencion ${row.status ?? "creada"}.`, `/app/control/atenciones/${row.id}${row.status === "pendiente_pago" ? "?focus=payment" : ""}`));
  });

  channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_orders", filter }, (payload) => {
    const row = payload.new as any;
    const previous = payload.old as any;
    if (row.status === previous.status) return;
    if (row.status === "pagado") onEvent(notify("service_order_paid", "Atencion pagada.", `/app/control/atenciones/${row.id}`));
    if (row.status === "anulado") onEvent(notify("service_order_voided", "Atencion anulada.", `/app/control/atenciones/${row.id}`));
    if (row.status === "pendiente_pago") onEvent(notify("service_order_pending_payment", "Atencion pendiente de cobro.", `/app/control/atenciones/${row.id}?focus=payment`));
  });

  channel.on("postgres_changes", { event: "*", schema: "public", table: "product_branch_stock", filter }, () => {
    onEvent(notify("stock_changed", "Cambio de stock detectado."));
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onStatus?.("synced");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      const message = "No se pudo mantener la sincronizacion realtime.";
      onStatus?.("error");
      onError?.(message);
      onEvent(notify("sync_error", message));
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
