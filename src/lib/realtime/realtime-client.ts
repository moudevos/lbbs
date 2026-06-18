"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeNotification } from "./realtime-events";
import { eventTitle } from "./realtime-events";

export type RealtimeStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error" | "disabled";

export type RealtimeErrorInfo = {
  status: string;
  name: string;
  message: string;
  timestamp: string;
};

type SubscribeInput = {
  branchId?: string | null;
  onEvent: (notification: RealtimeNotification) => void;
  onStatus: (status: RealtimeStatus) => void;
  onError: (error: RealtimeErrorInfo) => void;
  maxRetries?: number;
};

export type RealtimeSubscription = {
  retry: () => void;
  stop: () => void;
};

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

export function subscribeToOperationalRealtime({ branchId, onEvent, onStatus, onError, maxRetries = 5 }: SubscribeInput): RealtimeSubscription {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  let stopped = false;

  const removeCurrentChannel = async () => {
    if (!channel) return;
    const current = channel;
    channel = null;
    await supabase.removeChannel(current);
  };

  const scheduleRetry = (status: string) => {
    if (stopped || retryTimer) return;
    if (retryCount >= maxRetries) {
      onStatus("disabled");
      return;
    }
    retryCount += 1;
    onStatus("reconnecting");
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect(true);
    }, Math.min(5000 * 2 ** (retryCount - 1), 30000));
    if (process.env.NODE_ENV === "development") {
      console.error("Realtime subscribe error", { status, err: "Retry scheduled" });
    }
  };

  const connect = async (isRetry = false) => {
    if (stopped) return;
    await removeCurrentChannel();
    onStatus(isRetry ? "reconnecting" : "connecting");
    const filter = branchFilter(branchId);
    const channelName = `branch:${branchId ?? "all"}:events:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    channel = supabase.channel(channelName);

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

    channel.subscribe((status, error) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        retryCount = 0;
        onStatus("connected");
        return;
      }
      if (!["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) return;
      const info = {
        status,
        name: error?.name ?? "RealtimeError",
        message: error?.message ?? "No se pudo mantener la sincronizacion realtime.",
        timestamp: new Date().toISOString()
      };
      onError(info);
      if (status === "CHANNEL_ERROR") onStatus("error");
      scheduleRetry(status);
    });
  };

  void connect();

  return {
    retry() {
      if (stopped) return;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      retryCount = 0;
      void connect(true);
    },
    stop() {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      void removeCurrentChannel();
      onStatus("idle");
    }
  };
}
