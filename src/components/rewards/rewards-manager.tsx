"use client";

import { useEffect, useState } from "react";
import { showError } from "@/lib/ui/swal";

type Metrics = {
  availableClients: number; redeemedRewards: number; rewardCost: number; averageProgress: number; pendingRisk: number;
  byBarber: { id: string; name: string; count: number; total: number }[];
  byBranch: { id: string; name: string; count: number; total: number }[];
  frequentCustomers: { id: string; name: string; phone: string; visits: number; used: number; progress: number }[];
};

export function RewardsManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ from, to, branch_id: localStorage.getItem("lbbs:branchScope") ?? "all" });
    const response = await fetch(`/api/control/rewards/metrics?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudieron cargar rewards", data.error);
    setMetrics(data);
  }

  useEffect(() => {
    const params = new URLSearchParams({ from, to, branch_id: localStorage.getItem("lbbs:branchScope") ?? "all" });
    fetch(`/api/control/rewards/metrics?${params}`)
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (response.ok) setMetrics(data);
        else void showError("No se pudieron cargar rewards", data.error);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-semibold">Rewards</h1><p className="mt-1 text-sm text-[var(--text-muted)]">6 atenciones válidas habilitan un Corte Clásico gratis.</p></div>
        <div className="flex gap-2"><input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} /><button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={load}>{loading ? "Cargando..." : "Aplicar"}</button></div>
      </div>
      {metrics ? <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Clientes con reward disponible" value={metrics.availableClients} />
          <Metric label="Rewards canjeados" value={metrics.redeemedRewards} />
          <Metric label="Costo rewards" value={`S/ ${metrics.rewardCost.toFixed(2)}`} />
          <Metric label="Progreso promedio" value={`${metrics.averageProgress.toFixed(1)} / 6`} />
          <Metric label="Riesgo rewards pendiente" value={`S/ ${metrics.pendingRisk.toFixed(2)}`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <List title="Rewards por barbero" rows={metrics.byBarber.map((r) => `${r.name} - ${r.count} cortes - S/ ${r.total.toFixed(2)}`)} />
          <List title="Rewards por sede" rows={metrics.byBranch.map((r) => `${r.name} - ${r.count} canjeados - S/ ${r.total.toFixed(2)}`)} />
          <List title="Clientes frecuentes" rows={metrics.frequentCustomers.map((r) => `${r.name} · ${r.phone} · ${r.visits} atenciones · ${r.used} rewards · ${r.progress}/6`)} />
        </div>
      </> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold text-[var(--gold)]">{value}</p></div>;
}
function List({ title, rows }: { title: string; rows: string[] }) {
  return <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">{rows.length ? rows.map((row) => <p key={row} className="rounded-lg border border-[var(--border-soft)] p-2">{row}</p>) : <p>Sin datos en el periodo.</p>}</div></div>;
}
