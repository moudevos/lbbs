"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeNotification } from "./realtime-events";
import type { RealtimeErrorInfo, RealtimeStatus, RealtimeSubscription } from "./realtime-client";

type BroadcastEvent = {
  id: string; type: string; title: string; body: string; url?: string | null;
  created_at?: string; branch_id?: string; payload?: Record<string, unknown>;
};

export function subscribeToOperationalBroadcast({
  branchIds,
  onEvent,
  onStatus,
  onError
}: {
  branchIds: string[];
  onEvent: (event: RealtimeNotification) => void;
  onStatus: (status: RealtimeStatus) => void;
  onError: (error: RealtimeErrorInfo) => void;
}): RealtimeSubscription {
  const supabase = createClient();
  let channels: RealtimeChannel[] = [];
  let stopped = false;
  const debug = process.env.NEXT_PUBLIC_REALTIME_DEBUG === "true";

  async function stopChannels() {
    const current = channels;
    channels = [];
    await Promise.all(current.map((channel) => supabase.removeChannel(channel)));
  }

  async function connect(retry = false) {
    if (stopped) return;
    onStatus(retry ? "reconnecting" : "connecting");
    await stopChannels();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      onStatus("error");
      onError({ status: "NO_SESSION", name: "RealtimeAuthError", message: "No hay sesion autenticada para Broadcast privado.", timestamp: new Date().toISOString() });
      return;
    }
    await supabase.realtime.setAuth(session.access_token);
    if (!branchIds.length) {
      onStatus("disabled");
      return;
    }
    let subscribed = 0;
    channels = branchIds.map((branchId) => {
      const topic = `branch:${branchId}`;
      const channel = supabase.channel(topic, { config: { private: true, broadcast: { self: false } } });
      channel.on("broadcast", { event: "*" }, ({ payload }) => {
        const event = payload as BroadcastEvent;
        if (debug) console.info("[realtime] event", { topic, type: event.type, id: event.id });
        onEvent({
          id: event.id,
          type: event.type,
          title: event.title,
          message: event.body,
          href: event.url ?? undefined,
          createdAt: event.created_at ?? new Date().toISOString(),
          read: false
        });
      });
      channel.subscribe((status, error) => {
        if (debug) console.info("[realtime] channel", { topic, status, error: error?.message });
        if (status === "SUBSCRIBED") {
          subscribed += 1;
          if (subscribed === branchIds.length) onStatus("connected");
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && !stopped) {
          onStatus(status === "CHANNEL_ERROR" ? "error" : "reconnecting");
          onError({ status, name: error?.name ?? "RealtimeError", message: error?.message ?? `Canal ${topic} no disponible.`, timestamp: new Date().toISOString() });
        }
      });
      return channel;
    });
  }

  void connect();
  return {
    retry() { void connect(true); },
    stop() { stopped = true; void stopChannels(); onStatus("idle"); }
  };
}

export function subscribeToLocalDeviceBroadcast({
  branchId,
  onEvent,
  onStatus
}: {
  branchId: string;
  onEvent: (event: RealtimeNotification) => void;
  onStatus?: (status: RealtimeStatus) => void;
}) {
  const supabase = createClient();
  const topic = `branch:${branchId}:devices`;
  const channel = supabase.channel(topic, { config: { private: false, broadcast: { self: false } } });
  channel.on("broadcast", { event: "*" }, ({ payload }) => {
    const event = payload as BroadcastEvent;
    onEvent({
      id: event.id,
      type: event.type,
      title: event.title,
      message: event.body,
      href: event.url?.replace(/^\/app\/control\/agenda/, "/local/agenda") ?? "/local/agenda",
      createdAt: event.created_at ?? new Date().toISOString(),
      read: false
    });
  });
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") onStatus?.("connected");
    else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) onStatus?.("reconnecting");
  });
  return () => void supabase.removeChannel(channel);
}
