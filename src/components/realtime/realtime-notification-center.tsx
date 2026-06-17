"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import type { RealtimeNotification } from "@/lib/realtime/realtime-events";
import { subscribeToOperationalRealtime } from "@/lib/realtime/realtime-client";

export function RealtimeNotificationCenter({ branchId }: { branchId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    return subscribeToOperationalRealtime({
      branchId,
      onEvent: (notification) => setItems((current) => [notification, ...current].slice(0, 10))
    });
  }, [branchId]);

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="relative">
      <button className="relative rounded-lg border border-[var(--border-soft)] p-2" onClick={() => setOpen((value) => !value)} aria-label="Notificaciones realtime">
        <Bell size={18} />
        {unread > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--gold)] px-1 text-[10px] font-bold text-black">{unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-[var(--border-soft)] bg-black p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Sincronizacion</p>
            <button className="text-xs text-[var(--gold-soft)]" onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))}>Marcar leidas</button>
          </div>
          <div className="grid max-h-96 gap-2 overflow-y-auto">
            {items.map((item) => {
              const content = <div className={`rounded-lg border px-3 py-2 text-sm ${item.read ? "border-[var(--border-soft)]" : "border-[var(--gold)]"}`}><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{item.message}</p></div>;
              return item.href ? <Link key={item.id} href={item.href} onClick={() => setOpen(false)}>{content}</Link> : <div key={item.id}>{content}</div>;
            })}
            {items.length === 0 ? <p className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">Sin eventos recientes.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
