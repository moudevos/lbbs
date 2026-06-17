"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import type { BarberOption, ReservationSummary } from "@/lib/reservations/types";
import { formatTime } from "@/lib/reservations/time";
import { showError, showSuccess, showWarning } from "@/lib/ui/swal";

export function LocalAgenda() {
  const [token, setToken] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState("");
  const [selectedBarbers, setSelectedBarbers] = useState<Record<string, string>>({});

  useEffect(() => {
    setToken(localStorage.getItem("lbbs:localToken") ?? "");
  }, []);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => {
      load(token);
    }, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, date]);

  async function load(nextToken = token) {
    if (!nextToken) return showWarning("Token requerido", "Ingresa el token/PIN del dispositivo local.");
    setLoading(true);
    localStorage.setItem("lbbs:localToken", nextToken);
    const response = await fetch(`/api/local/agenda?date=${date}`, { headers: { "x-local-token": nextToken } });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar agenda local", data.error ?? "Token invalido.");
    setReservations(data.reservations ?? []);
    setBarbers(data.barbers ?? []);
  }

  async function confirm(reservation: ReservationSummary) {
    const barberId = reservation.barberId ?? selectedBarbers[reservation.id] ?? "";
    if (!barberId) return showWarning("Barbero requerido", "Selecciona barbero antes de confirmar atencion.");
    setConfirmingId(reservation.id);
    const response = await fetch(`/api/local/reservations/${reservation.id}/confirm-attention`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-local-token": token },
      body: JSON.stringify({ barberId })
    });
    const data = await response.json();
    setConfirmingId("");
    if (!response.ok) return showError("No se pudo confirmar", data.error ?? "Intenta nuevamente.");
    await showSuccess("Atencion creada", "Caja podra cobrarla desde pendientes.");
    window.location.href = data.redirectTo;
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-[var(--border-soft)] bg-black/50 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Modo local / kiosko</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Agenda local</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Solo agenda y confirmacion de atenciones. Caja cobra despues.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={() => load()}>{loading ? "Cargando..." : "Cargar"}</button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black" href="/local/agenda">Agenda</Link>
            <Link className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/local/atenciones/nueva">Nueva atencion</Link>
            <Link className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/local/ranking">Top barberos</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {loading ? <div className="rounded-2xl border border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">Cargando reservas confirmadas...</div> : null}
          {reservations.map((reservation) => (
            <article key={reservation.id} className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-[var(--gold-soft)]">{formatTime(reservation.startsAt)} - {reservation.status}</p>
                  <h2 className="mt-1 text-xl font-semibold">{reservation.customer}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{reservation.service} - {reservation.barber ?? "Sin barbero"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!reservation.barberId ? (
                    <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={selectedBarbers[reservation.id] ?? ""} onChange={(event) => setSelectedBarbers({ ...selectedBarbers, [reservation.id]: event.target.value })}>
                      <option value="">Barbero</option>
                      {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
                    </select>
                  ) : null}
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={() => confirm(reservation)}>
                    <CalendarCheck size={16} />
                    {confirmingId === reservation.id ? "Confirmando..." : "Confirmar atencion"}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!loading && reservations.length === 0 ? <div className="rounded-2xl border border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">Sin reservas cargadas para este dia.</div> : null}
        </div>
      </section>
    </main>
  );
}
