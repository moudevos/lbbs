"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { showError } from "@/lib/ui/swal";

type Metrics = { availableClients: number; redeemedRewards: number; rewardCost: number; averageProgress: number; pendingRisk: number };
type RewardRow = { id: string; name: string; phone: string; branchName?: string; totalVisits: number; progress: number; availableRewards: number; redeemedRewards: number; lastVisitAt: string | null };

export function RewardsManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const branchId = localStorage.getItem("lbbs:branchScope") ?? "all";
    const metricsParams = new URLSearchParams({ from, to, branch_id: branchId });
    const rewardsParams = new URLSearchParams({ branch_id: branchId });
    if (query.trim()) rewardsParams.set("q", query.trim());
    const [metricsResponse, rewardsResponse] = await Promise.all([
      fetch(`/api/control/rewards/metrics?${metricsParams}`),
      fetch(`/api/control/rewards?${rewardsParams}`)
    ]);
    const [metricsData, rewardsData] = await Promise.all([metricsResponse.json(), rewardsResponse.json()]);
    setLoading(false);
    if (!metricsResponse.ok || !rewardsResponse.ok) return showError("No se pudieron cargar rewards", metricsData.error ?? rewardsData.error);
    setMetrics(metricsData);
    setRows(rewardsData.rewards ?? []);
  }

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("branch-scope-change", refresh);
    return () => window.removeEventListener("branch-scope-change", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const filtered = rows.filter((row) =>
    status === "all"
    || (status === "available" && row.availableRewards > 0)
    || (status === "progress" && row.availableRewards === 0 && row.progress > 0)
    || (status === "redeemed" && row.redeemedRewards > 0)
  );

  return (
    <section className="grid min-w-0 gap-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(0,760px)] xl:items-end">
        <h1 className="sr-only">Rewards</h1>
        <div className="grid gap-2 sm:grid-cols-[145px_145px_minmax(180px,1fr)_auto]">
          <input className="control-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="control-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <input className="control-input" placeholder="Nombre o celular" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} />
          <button className="rounded-lg bg-[var(--control-primary)] px-4 py-2 font-semibold text-[var(--control-primary-text)]" onClick={load}>{loading ? "Cargando..." : "Buscar"}</button>
        </div>
      </div>
      {metrics ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Reward disponible" value={metrics.availableClients} /><Metric label="Canjeados" value={metrics.redeemedRewards} /><Metric label="Costo rewards" value={`S/ ${metrics.rewardCost.toFixed(2)}`} /><Metric label="Progreso promedio" value={`${metrics.averageProgress.toFixed(1)} / 6`} /><Metric label="Riesgo pendiente" value={`S/ ${metrics.pendingRisk.toFixed(2)}`} />
      </div> : null}
      <section className="min-w-0 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Clientes con rewards / progreso</h2><p className="text-xs text-[var(--control-muted)]">Cliente genérico excluido.</p></div><select className="control-input sm:w-52" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos</option><option value="available">Reward disponible</option><option value="progress">En progreso</option><option value="redeemed">Canjeados</option></select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="text-xs uppercase text-[var(--control-muted)]"><tr><th className="p-2">Cliente</th><th className="p-2">Sede</th><th className="p-2">Visitas</th><th className="p-2">Progreso</th><th className="p-2">Disponibles</th><th className="p-2">Última visita</th><th className="p-2">Estado</th><th className="p-2">Acción</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-t border-[var(--control-border)]"><td className="p-2"><strong>{row.name}</strong><p className="text-xs text-[var(--control-muted)]">{row.phone}</p></td><td className="p-2">{row.branchName ?? "Sin sede"}</td><td className="p-2">{row.totalVisits}</td><td className="p-2">{row.progress}/6</td><td className="p-2 font-semibold text-[var(--gold-soft)]">{row.availableRewards}</td><td className="p-2">{row.lastVisitAt ? new Date(row.lastVisitAt).toLocaleDateString("es-PE") : "Sin visitas"}</td><td className="p-2">{row.availableRewards > 0 ? "Reward disponible" : row.redeemedRewards > 0 && row.progress === 0 ? "Canjeado" : "En progreso"}</td><td className="p-2"><Link className="rounded-lg border border-[var(--control-border)] px-2 py-1" href={`/app/control/clientes?customer=${row.id}`}>Ver cliente</Link></td></tr>)}</tbody></table></div>
        {!loading && filtered.length === 0 ? <p className="py-5 text-center text-sm text-[var(--control-muted)]">Sin clientes para los filtros seleccionados.</p> : null}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-3"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-1 text-xl font-semibold text-[var(--gold-soft)]">{value}</p></div>;
}
