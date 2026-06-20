"use client";

import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { RealtimeNotification } from "@/lib/realtime/realtime-events";
import {
  operationalNotificationClearEvent,
  operationalNotificationDismissEvent,
  operationalNotificationEvent
} from "@/lib/notifications/operational-notification-events";

const storageKey = "lbbs:operational-toasts";

export function OperationalToastLayer() {
  const [items, setItems] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(sessionStorage.getItem(storageKey) ?? "[]"));
    } catch {
      sessionStorage.removeItem(storageKey);
    }

    const onNotification = (event: Event) => {
      const notification = (event as CustomEvent<RealtimeNotification>).detail;
      setItems((current) => persist(current.some((item) => item.id === notification.id)
        ? current
        : [notification, ...current].slice(0, 5)));
    };
    const onDismiss = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail.id;
      setItems((current) => persist(current.filter((item) => item.id !== id)));
    };
    const onClear = () => setItems(persist([]));

    window.addEventListener(operationalNotificationEvent, onNotification);
    window.addEventListener(operationalNotificationDismissEvent, onDismiss);
    window.addEventListener(operationalNotificationClearEvent, onClear);
    return () => {
      window.removeEventListener(operationalNotificationEvent, onNotification);
      window.removeEventListener(operationalNotificationDismissEvent, onDismiss);
      window.removeEventListener(operationalNotificationClearEvent, onClear);
    };
  }, []);

  if (!items.length) return null;
  return (
    <aside className="pointer-events-none fixed inset-x-3 bottom-3 z-[1400] grid gap-2 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-20 sm:w-[min(390px,calc(100vw-2rem))]" aria-live="polite">
      {items.map((item) => (
        <article key={item.id} className="pointer-events-auto rounded-2xl border border-[var(--control-primary-border)] bg-[var(--control-surface)] p-4 text-[var(--control-text)] shadow-[var(--control-shadow)]">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--control-primary-soft)] p-2 text-[var(--gold-soft)]"><BellRing size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--control-muted)]">{item.message}</p>
              {item.href ? <Link className="mt-3 inline-flex rounded-lg border border-[var(--control-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-soft)]" href={item.href}>Ver</Link> : null}
            </div>
            <button className="rounded-lg p-1 text-[var(--control-muted)] hover:bg-[var(--control-surface-2)]" onClick={() => setItems((current) => persist(current.filter((entry) => entry.id !== item.id)))} aria-label="Cerrar notificacion">
              <X size={17} />
            </button>
          </div>
        </article>
      ))}
    </aside>
  );
}

function persist(items: RealtimeNotification[]) {
  sessionStorage.setItem(storageKey, JSON.stringify(items));
  return items;
}
