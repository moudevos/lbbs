"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { showError, showWarning } from "@/lib/ui/swal";

type RankingRow = { employeeId: string; name: string; servicesCount: number };

export function LocalRanking() {
  const [token, setToken] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("lbbs:localToken") ?? "";
    setToken(savedToken);
    load(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextToken = token) {
    if (!nextToken) return showWarning("Token requerido", "Escanea el QR del dispositivo.");
    setLoading(true);
    const response = await fetch(`/api/local/ranking?date=${date}`, { headers: { "x-local-token": nextToken } });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar ranking", data.error ?? "Token invalido.");
    setRanking(data.ranking ?? []);
  }

  return (
    <main className="min-h-screen bg-[var(--control-bg)] px-4 py-20 text-[var(--control-text)]">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5 shadow-[var(--control-shadow)]">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Modo local</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Top barberos</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Solo cantidad de servicios. Sin caja, montos ni produccion financiera.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input className="control-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={() => load()}>{loading ? "Cargando..." : "Cargar"}</button>
              <Link className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/local/agenda">Agenda</Link>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {loading ? <div className="rounded-2xl border border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">Cargando ranking...</div> : null}
          {ranking.map((row, index) => (
            <article key={row.employeeId} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 shadow-[var(--control-shadow)]">
              <div>
                <p className="text-xs text-[var(--gold-soft)]">#{index + 1}</p>
                <h2 className="text-lg font-semibold">{row.name}</h2>
              </div>
              <strong className="text-2xl text-[var(--gold)]">{row.servicesCount}</strong>
            </article>
          ))}
          {!loading && ranking.length === 0 ? <div className="rounded-2xl border border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">Sin servicios registrados para la fecha.</div> : null}
        </div>
      </section>
    </main>
  );
}
