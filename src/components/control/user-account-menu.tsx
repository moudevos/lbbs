"use client";

import Image from "next/image";
import { CheckCircle2, ChevronDown, Loader2, LogOut, Palette, UserRound, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { CurrentEmployee } from "@/lib/auth/types";
import type { RealtimeStatus } from "@/lib/realtime/realtime-client";
import { createClient } from "@/lib/supabase/client";
import { CONTROL_THEME_KEY } from "./control-theme-provider";

export function UserAccountMenu({ employee, syncStatus, lastSyncAt }: { employee: CurrentEmployee; syncStatus: RealtimeStatus; lastSyncAt: string | null }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [theme, setTheme] = useState("dark-functional");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(localStorage.getItem(CONTROL_THEME_KEY) ?? "dark-functional");
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  function changeTheme(next: string) {
    setTheme(next);
    localStorage.setItem(CONTROL_THEME_KEY, next);
    window.dispatchEvent(new CustomEvent("control-preferences-change", { detail: { theme: next } }));
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/audit-logout", { method: "POST" });
    await createClient().auth.signOut();
    router.replace("/app/login");
    router.refresh();
  }

  const panel = open && mounted ? createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Menú de usuario"
      className="fixed right-4 top-20 z-[1500] max-h-[calc(100vh-6rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 text-[var(--control-text)] shadow-[var(--control-shadow)] md:right-6"
    >
      <div className="flex items-center gap-3 border-b border-[var(--border-soft)] pb-4">
        <Avatar employee={employee} large />
        <div className="min-w-0">
          <p className="truncate font-semibold">{employee.fullName}</p>
          <p className="truncate text-sm text-[var(--text-muted)]">{employee.email || "Sin correo registrado"}</p>
        </div>
      </div>
      <dl className="grid gap-2 py-4 text-sm">
        <Detail label="Rol" value={employee.role} />
        <Detail label="Sede" value={employee.branchName || "Todas las sedes"} />
        <Detail label="Cuenta" value={employee.isActive ? "Activa" : "Inactiva"} />
      </dl>
      <div className="rounded-xl border border-[var(--border-soft)] p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Sincronización</p>
        <SyncState status={syncStatus} lastSyncAt={lastSyncAt} />
      </div>
      <label className="mt-3 block text-sm text-[var(--control-muted)]">
        <span className="inline-flex items-center gap-2"><Palette size={16} /> Tema operativo</span>
        <select className="control-input mt-2" value={theme} onChange={(event) => changeTheme(event.target.value)}>
          <option value="dark-functional">Funcional oscuro</option>
          <option value="light-operational">Claro operativo</option>
          <option value="high-contrast">Alto contraste</option>
        </select>
      </label>
      <button type="button" disabled={loggingOut} onClick={logout} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--control-danger)] bg-[var(--control-danger-soft)] px-3 py-2 text-sm text-[var(--control-danger)] disabled:opacity-60">
        {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} {loggingOut ? "Saliendo..." : "Cerrar sesión"}
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="control-surface flex items-center gap-2 rounded-xl border border-[var(--border-soft)] px-2 py-1.5 text-left" aria-expanded={open}>
        <Avatar employee={employee} />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold">{employee.fullName}</span>
          <span className="block text-xs capitalize text-[var(--text-muted)]">{employee.role}</span>
        </span>
        <ChevronDown size={15} className={`text-[var(--text-muted)] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {panel}
    </div>
  );
}

function Avatar({ employee, large = false }: { employee: CurrentEmployee; large?: boolean }) {
  const size = large ? "h-14 w-14" : "h-9 w-9";
  if (employee.profilePhotoUrl) {
    return <span className={`relative block shrink-0 overflow-hidden rounded-full border border-[var(--border-soft)] ${size}`}><Image src={employee.profilePhotoUrl} alt={employee.fullName} fill unoptimized className="object-cover" /></span>;
  }
  return <span className={`grid shrink-0 place-items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-main)] text-[var(--gold)] ${size}`}><UserRound size={large ? 24 : 17} /></span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-[var(--text-muted)]">{label}</dt><dd className="truncate text-right capitalize">{value}</dd></div>;
}

function SyncState({ status, lastSyncAt }: { status: RealtimeStatus; lastSyncAt: string | null }) {
  if (status === "connected") return <p className="mt-2 inline-flex items-center gap-2 text-sm text-green-600"><CheckCircle2 size={16} /> Conectado{lastSyncAt ? ` · ${new Date(lastSyncAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>;
  if (status === "disabled" || status === "error") return <p className="mt-2 inline-flex items-center gap-2 text-sm text-red-500"><XCircle size={16} /> Sin conexión Realtime</p>;
  return <p className="mt-2 inline-flex items-center gap-2 text-sm text-amber-600"><Loader2 size={16} className="animate-spin" /> Conectando</p>;
}
