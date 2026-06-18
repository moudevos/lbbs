"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Loader2, RefreshCcw, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RealtimeNotification } from "@/lib/realtime/realtime-events";
import { subscribeToOperationalRealtime, type RealtimeErrorInfo, type RealtimeStatus, type RealtimeSubscription } from "@/lib/realtime/realtime-client";

export function RealtimeNotificationCenter({ branchId, onStatusChange }: { branchId?: string | null; onStatusChange?: (status: RealtimeStatus, lastSyncAt: string | null) => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);
  const statusCallbackRef = useRef(onStatusChange);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RealtimeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<RealtimeStatus>("idle");
  const [syncError, setSyncError] = useState<RealtimeErrorInfo | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    statusCallbackRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    setSyncStatus("connecting");
    setSyncError(null);
    const timer = window.setTimeout(() => setLoading(false), 800);
    subscriptionRef.current?.stop();
    const subscription = subscribeToOperationalRealtime({
      branchId,
      onStatus: (status) => {
        setSyncStatus(status);
        const syncedAt = status === "connected" ? new Date().toISOString() : null;
        if (status === "connected") {
          setRetrying(false);
          setSyncError(null);
          setLastSyncAt(syncedAt);
        }
        statusCallbackRef.current?.(status, syncedAt);
        if (status === "disabled") setRetrying(false);
      },
      onError: (error) => setSyncError(error),
      onEvent: (notification) => {
        setLoading(false);
        setItems((current) => [notification, ...current].slice(0, 10));
      }
    });
    subscriptionRef.current = subscription;
    return () => {
      window.clearTimeout(timer);
      subscription.stop();
      if (subscriptionRef.current === subscription) subscriptionRef.current = null;
    };
  }, [branchId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (panelRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const unread = items.filter((item) => !item.read).length;

  async function markRead() {
    if (markingRead) return;
    setMarkingRead(true);
    window.setTimeout(() => {
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setMarkingRead(false);
    }, 250);
  }

  function retrySync() {
    if (retrying) return;
    setRetrying(true);
    setSyncStatus("reconnecting");
    setSyncError(null);
    subscriptionRef.current?.retry();
  }

  const panel = open && mounted ? createPortal(
    <div
      ref={panelRef}
      className="fixed right-4 top-16 z-[1200] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-[var(--border-soft)] bg-black/95 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl md:right-6 md:top-20"
      role="dialog"
      aria-label="Centro de notificaciones"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Centro de notificaciones</p>
          <SyncStatus status={syncStatus} lastSyncAt={lastSyncAt} />
        </div>
        <button className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--gold-soft)] disabled:opacity-60" disabled={markingRead} onClick={markRead}>
          {markingRead ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Leyendo</span> : "Marcar leidas"}
        </button>
      </div>

      {syncStatus === "error" || syncStatus === "reconnecting" || syncStatus === "disabled" ? (
        <div className="mb-3 rounded-xl border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs text-red-100" title={syncError ? `${syncError.name} · ${formatTime(syncError.timestamp)}` : undefined}>
          <p>{syncStatus === "disabled" ? "Realtime no disponible. Puedes seguir usando el sistema y actualizar manualmente." : "Reconectando sincronización..."}</p>
          <button className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200/30 px-2 py-1 disabled:opacity-60" disabled={retrying} onClick={retrySync}>
            {retrying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />} Reintentar sincronización
          </button>
        </div>
      ) : null}

      <div className="grid max-h-[min(70vh,28rem)] gap-2 overflow-y-auto pr-1">
        {loading || retrying ? <p className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]"><Loader2 size={14} className="animate-spin" /> Cargando notificaciones...</p> : null}
        {items.map((item) => (
          <article key={item.id} className={`rounded-xl border px-3 py-2 text-sm ${item.read ? "border-[var(--border-soft)] bg-black/30" : "border-[var(--gold)] bg-[rgba(212,175,55,0.08)]"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--gold-soft)]">{notificationTypeLabel(item.type)}</p>
                <p className="font-semibold">{item.title}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${item.read ? "bg-white/5 text-[var(--text-muted)]" : "bg-[var(--gold)] text-black"}`}>{item.read ? "Leida" : "Nueva"}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{item.message}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-faint)]">{formatTime(item.createdAt)}</span>
              {item.href ? <Link className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-[var(--gold-soft)]" href={item.href} onClick={() => setOpen(false)}>Ver</Link> : null}
            </div>
          </article>
        ))}
        {!loading && !retrying && items.length === 0 ? <p className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">Sin eventos recientes.</p> : null}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button className="relative rounded-lg border border-[var(--border-soft)] p-2" onClick={() => setOpen((value) => !value)} aria-label="Notificaciones realtime" aria-expanded={open}>
        <Bell size={18} />
        {unread > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-black">{unread}</span> : null}
      </button>
      {panel}
    </div>
  );
}

function SyncStatus({ status, lastSyncAt }: { status: RealtimeStatus; lastSyncAt: string | null }) {
  if (status === "connecting" || status === "idle") return <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"><Loader2 size={12} className="animate-spin" /> Conectando...</p>;
  if (status === "reconnecting" || status === "error") return <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-200"><Loader2 size={12} className="animate-spin" /> Reconectando sincronización...</p>;
  if (status === "disabled") return <p className="mt-1 inline-flex items-center gap-1 text-xs text-red-200"><XCircle size={12} /> Realtime no disponible</p>;
  return <p className="mt-1 inline-flex items-center gap-1 text-xs text-green-200"><CheckCircle2 size={12} /> Sincronizado {lastSyncAt ? `· última conexión ${formatTime(lastSyncAt)}` : ""}</p>;
}

function notificationTypeLabel(type: RealtimeNotification["type"]) {
  const labels: Record<RealtimeNotification["type"], string> = {
    reservation_created: "Nueva reserva",
    reservation_status_changed: "Reserva actualizada",
    reservation_confirmed: "Reserva confirmada",
    service_order_created: "Atencion",
    service_order_pending_payment: "Pendiente de pago",
    service_order_paid: "Atencion pagada",
    service_order_voided: "Atencion anulada",
    stock_changed: "Stock"
  };
  return labels[type];
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
