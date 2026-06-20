"use client";

import Link from "next/link";
import { Bell, CheckCircle2, Loader2, RefreshCcw, Trash2, Volume2, VolumeX, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RealtimeNotification } from "@/lib/realtime/realtime-events";
import { type RealtimeErrorInfo, type RealtimeStatus, type RealtimeSubscription } from "@/lib/realtime/realtime-client";
import { subscribeToOperationalBroadcast } from "@/lib/realtime/operational-realtime-client";
import { notificationSoundPreferenceKey, playNotificationSound } from "@/lib/notifications/play-notification-sound";
import { clearOperationalNotifications, dismissOperationalNotification, publishOperationalNotification } from "@/lib/notifications/operational-notification-events";

export function RealtimeNotificationCenter({ branchId, onStatusChange }: { branchId?: string | null; onStatusChange?: (status: RealtimeStatus, lastSyncAt: string | null) => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const subscriptionRef = useRef<RealtimeSubscription | null>(null);
  const knownIdsRef = useRef(new Set<string>());
  const statusCallbackRef = useRef(onStatusChange);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RealtimeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<RealtimeStatus>("idle");
  const [syncError, setSyncError] = useState<RealtimeErrorInfo | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [reminderTestBusy, setReminderTestBusy] = useState(false);
  const [branchIds, setBranchIds] = useState<string[]>(branchId ? [branchId] : []);

  useEffect(() => {
    statusCallbackRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    setMounted(true);
    setSoundEnabled(localStorage.getItem(notificationSoundPreferenceKey) === "enabled");
  }, []);

  useEffect(() => {
    if (branchId) {
      setBranchIds([branchId]);
      return;
    }
    void fetch("/api/public/reservation-options").then((response) => response.json()).then((data) => {
      setBranchIds((data.branches ?? []).map((branch: { id: string }) => branch.id));
    });
  }, [branchId]);

  useEffect(() => {
    if (!branchIds.length) return;
    setLoading(true);
    setSyncStatus("connecting");
    setSyncError(null);
    const timer = window.setTimeout(() => setLoading(false), 800);
    subscriptionRef.current?.stop();
    const subscription = subscribeToOperationalBroadcast({
      branchIds,
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
        knownIdsRef.current.add(notification.id);
        setLoading(false);
        setItems((current) => current.some((item) => item.id === notification.id)
          ? current
          : [notification, ...current].slice(0, 10));
        void playNotificationSound();
        publishOperationalNotification(notification);
      }
    });
    subscriptionRef.current = subscription;
    return () => {
      window.clearTimeout(timer);
      subscription.stop();
      if (subscriptionRef.current === subscription) subscriptionRef.current = null;
    };
  }, [branchIds]);

  useEffect(() => {
    if (!mounted) return;
    const syncNotifications = async (notifyNew = false) => fetch("/api/control/notifications").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      const notifications: RealtimeNotification[] = data.notifications ?? [];
      if (notifyNew && knownIdsRef.current.size > 0) {
        for (const notification of notifications.slice().reverse()) {
          if (knownIdsRef.current.has(notification.id)) continue;
          publishOperationalNotification(notification);
          void playNotificationSound();
        }
      }
      notifications.forEach((notification) => knownIdsRef.current.add(notification.id));
      setItems(notifications);
      setLoading(false);
    });
    void syncNotifications();
    const timer = window.setInterval(() => void syncNotifications(true), 30000);
    return () => window.clearInterval(timer);
  }, [mounted]);

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
    await fetch("/api/control/notifications/read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: items.filter((item) => !item.read).map((item) => item.id) })
    });
    window.setTimeout(() => {
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setMarkingRead(false);
    }, 250);
  }

  async function dismiss(id: string) {
    const response = await fetch("/api/control/notifications/dismiss", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] })
    });
    if (!response.ok) return;
    setItems((current) => current.filter((item) => item.id !== id));
    dismissOperationalNotification(id);
  }

  async function clearAll() {
    if (clearing || !items.length) return;
    setClearing(true);
    try {
      const response = await fetch("/api/control/notifications/dismiss", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true })
      });
      if (!response.ok) return;
      setItems([]);
      clearOperationalNotifications();
    } finally {
      setClearing(false);
    }
  }

  async function sendTest() {
    if (testBusy) return;
    setTestBusy(true);
    try {
      const response = await fetch("/api/control/notifications/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branchId ?? branchIds[0] })
      });
      if (!response.ok) window.alert((await response.json()).error ?? "No se pudo emitir el evento.");
    } finally {
      setTestBusy(false);
    }
  }

  async function sendReminderTest() {
    if (reminderTestBusy) return;
    setReminderTestBusy(true);
    try {
      const response = await fetch("/api/control/notifications/test-reminder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branchId ?? branchIds[0] })
      });
      if (!response.ok) window.alert((await response.json()).error ?? "No se pudo emitir el recordatorio de prueba.");
    } finally {
      setReminderTestBusy(false);
    }
  }

  function retrySync() {
    if (retrying) return;
    setRetrying(true);
    setSyncStatus("reconnecting");
    setSyncError(null);
    subscriptionRef.current?.retry();
  }

  async function toggleSound() {
    const next = !soundEnabled;
    localStorage.setItem(notificationSoundPreferenceKey, next ? "enabled" : "disabled");
    setSoundEnabled(next);
    if (next) {
      try { await playNotificationSound(); } catch { setSoundEnabled(false); }
    }
  }

  async function activatePush() {
    if (pushBusy) return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return window.alert("Notificaciones push no configuradas.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return window.alert("Este navegador no soporta notificaciones push.");
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return window.alert("Debes permitir notificaciones para activar push.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/control/notifications/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON())
      });
      const result = await response.json();
      if (!response.ok) window.alert(result.error ?? "No se pudo guardar la suscripcion push.");
    } finally {
      setPushBusy(false);
    }
  }

  const panel = open && mounted ? createPortal(
    <div
      ref={panelRef}
      className="fixed right-4 top-16 z-[1200] max-h-[calc(100vh-5rem)] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 text-[var(--control-text)] shadow-[var(--control-shadow)] md:right-6 md:top-20"
      role="dialog"
      aria-label="Centro de notificaciones"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Centro de notificaciones</p>
          <SyncStatus status={syncStatus} lastSyncAt={lastSyncAt} />
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--gold-soft)] disabled:opacity-60" disabled={markingRead} onClick={markRead}>
            {markingRead ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Leyendo</span> : "Marcar leidas"}
          </button>
          <button className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-2 py-1 text-xs text-red-300 disabled:opacity-60" disabled={clearing || !items.length} onClick={clearAll}>
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Limpiar
          </button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs" onClick={toggleSound}>
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />} {soundEnabled ? "Sonido activo" : "Activar sonido"}
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs disabled:opacity-60" disabled={pushBusy} onClick={activatePush}>
          {pushBusy ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />} Activar push
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs disabled:opacity-60" disabled={testBusy} onClick={sendTest}>
          {testBusy ? <Loader2 size={13} className="animate-spin" /> : null} Enviar evento de prueba
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-xs disabled:opacity-60" disabled={reminderTestBusy} onClick={sendReminderTest}>
          {reminderTestBusy ? <Loader2 size={13} className="animate-spin" /> : null} Probar recordatorio
        </button>
        {!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? <span className="self-center text-xs text-[var(--control-muted)]">Push no configurado</span> : null}
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
          <article key={item.id} className={`rounded-xl border px-3 py-2 text-sm ${item.read ? "border-[var(--control-border)] bg-[var(--control-surface-2)]" : "border-[var(--control-primary-border)] bg-[var(--control-primary-soft)]"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--gold-soft)]">{notificationTypeLabel(item.type)}</p>
                <p className="font-semibold">{item.title}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${item.read ? "bg-[var(--control-surface-3)] text-[var(--control-muted)]" : "bg-[var(--control-primary)] text-[#17130a]"}`}>{item.read ? "Leida" : "Nueva"}</span>
                <button className="rounded p-1 text-[var(--control-muted)] hover:bg-[var(--control-surface-3)]" onClick={() => dismiss(item.id)} aria-label="Descartar notificacion"><X size={13} /></button>
              </div>
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
  const labels: Record<string, string> = {
    reservation_created: "Nueva reserva",
    reservation_status_changed: "Reserva actualizada",
    reservation_confirmed: "Reserva confirmada",
    service_order_created: "Atencion",
    service_order_pending_payment: "Pendiente de pago",
    service_order_paid: "Atencion pagada",
    service_order_voided: "Atencion anulada",
    stock_changed: "Stock"
    ,
    cash_closed: "Cierre de caja",
    notification_event: "Evento operativo",
    "reservation.created": "Nueva reserva",
    "reservation.updated": "Reserva editada",
    "reservation.rescheduled": "Reserva reprogramada",
    "reservation.status_changed": "Reserva actualizada",
    "service_order.created": "Atencion creada",
    "service_order.pending_payment": "Pendiente de pago",
    "service_order.paid": "Atencion pagada",
    "service_order.voided": "Atencion anulada"
  };
  return labels[type] ?? "Evento operativo";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
