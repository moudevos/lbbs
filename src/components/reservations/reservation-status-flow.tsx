"use client";

import type { ReservationStatus } from "@/lib/reservations/types";
import { getReservationAllowedActions, getReservationNextAction, reservationStatusLabel } from "@/lib/reservations/status-flow";

export function ReservationStatusFlow({
  status,
  serviceOrderId,
  busy,
  onChange,
  onReschedule,
  onViewAttention
}: {
  status: ReservationStatus;
  serviceOrderId?: string | null;
  busy?: boolean;
  onChange: (status: ReservationStatus, critical?: boolean) => void;
  onReschedule?: () => void;
  onViewAttention?: () => void;
}) {
  const next = getReservationNextAction(status);
  const secondary = getReservationAllowedActions(status);
  const final = status === "atendido" || status === "cancelado" || status === "no_asistio";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-[rgba(212,175,55,0.14)] px-2 py-1 text-xs text-[var(--gold-soft)]">
        {reservationStatusLabel(status)}
      </span>
      {next ? (
        <button type="button" disabled={busy} className="rounded-lg bg-[var(--gold)] px-3 py-2 text-xs font-semibold text-black disabled:opacity-60" onClick={() => onChange(next.status, next.critical)}>
          {busy && next.status === "atendido" ? "Procesando..." : next.label}
        </button>
      ) : null}
      {status === "atendido" && serviceOrderId ? (
        <button type="button" disabled={busy} className="rounded-lg bg-[var(--gold)] px-3 py-2 text-xs font-semibold text-black disabled:opacity-60" onClick={onViewAttention}>
          Ver atención
        </button>
      ) : null}
      {secondary.map((action) => (
        <button key={`${action.status}-${action.label}`} type="button" disabled={busy} className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)] hover:text-white disabled:opacity-60" onClick={() => action.kind === "reschedule" ? onReschedule?.() : onChange(action.status, action.critical)}>
          {action.label}
        </button>
      ))}
      {final ? <span className="text-xs text-[var(--text-muted)]">Estado final</span> : null}
    </div>
  );
}
