"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { showError } from "@/lib/ui/swal";
import type { BranchOption } from "@/lib/reservations/types";

type AgendaBlock = { time: string; status: "disponible" | "ocupado" | "cerrado" };

export function PublicAgendaView() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/reservation-options")
      .then((response) => response.json())
      .then((data) => {
        setBranches(data.branches ?? []);
        setBranchId(data.branches?.[0]?.id ?? "");
      });
  }, []);

  useEffect(() => {
    if (!branchId || !date) return;
    setLoading(true);
    fetch(`/api/public/agenda?branch_id=${branchId}&date=${date}`)
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(async ({ response, data }) => {
        setLoading(false);
        if (!response.ok) {
          await showError("No se pudo cargar agenda", data.error ?? "Intenta nuevamente.");
          return;
        }
        setBlocks(data.blocks ?? []);
      });
  }, [branchId, date]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">
              <CalendarDays size={16} /> Agenda publica
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Disponibilidad por sede</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Vista solo lectura. No mostramos datos de clientes ni montos.</p>
          </div>
          <Link className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black" href={`/reservar?sede=${branchId}`}>
            Reservar
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="text-sm text-[var(--text-muted)]">
            Sede
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[var(--text-muted)]">
            Fecha
            <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {loading ? <p className="text-sm text-[var(--text-muted)]">Cargando agenda...</p> : null}
          {!loading && blocks.map((block) => (
            <div key={block.time} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-black/35 px-3 py-2">
              <span className="font-semibold">{block.time}</span>
              <span className={block.status === "disponible" ? "text-sm text-green-300" : "text-sm text-red-200"}>
                {block.status === "disponible" ? "Disponible" : "Ocupado"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-black/35 px-3 py-2 text-sm text-[var(--text-muted)]">
          <MapPin size={16} className="text-[var(--gold)]" />
          Los horarios se muestran por bloques generales y pueden cambiar al confirmar una reserva.
        </div>
      </section>
    </main>
  );
}
