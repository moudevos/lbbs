"use client";

import { useEffect, useState } from "react";
import { showError } from "@/lib/ui/swal";

type RankingRow = { employeeId: string; name: string; servicesCount: number; netProduction: number; barberProductSales: number; productCredits: number };

function money(value: number) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}

export function RankingsManager() {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/control/rankings?from=${from}&to=${to}&branch_id=${localStorage.getItem("lbbs:branchScope") ?? "all"}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar rankings", data.error ?? "Error desconocido");
    setRows(data.rankings ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="sr-only">Rankings</h1>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={load}>{loading ? "Cargando..." : "Aplicar"}</button>
          <a className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href={`/api/control/reports/rankings/export?from=${from}&to=${to}&branch_id=all`}>Exportar XLSX</a>
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5 text-sm text-[var(--text-muted)]">Cargando rankings...</div> : null}
        {rows.map((row, index) => (
          <article key={row.employeeId} className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-[var(--gold-soft)]">#{index + 1}</p>
                <h2 className="text-xl font-semibold">{row.name}</h2>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <Metric label="Servicios" value={String(row.servicesCount)} />
                <Metric label="Produccion neta" value={money(row.netProduction)} />
                <Metric label="Venta barber_product" value={money(row.barberProductSales)} />
                <Metric label="Creditos producto" value={money(row.productCredits)} />
              </div>
            </div>
          </article>
        ))}
        {!loading && rows.length === 0 ? <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5 text-sm text-[var(--text-muted)]">Sin datos para el rango.</div> : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--border-soft)] px-3 py-2"><p className="text-xs text-[var(--text-muted)]">{label}</p><strong>{value}</strong></div>;
}
