"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";

type RewardRow = {
  id: string;
  name: string;
  phone: string;
  branchName: string | null;
  totalVisits: number;
  progress: number;
  availableRewards: number;
  earnedRewards: number;
  redeemedRewards: number;
  lastVisitAt: string | null;
};

export function RewardsManager() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    const response = await fetch(`/api/control/rewards?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar rewards", data.error ?? "Error desconocido");
    setRows(data.rewards ?? []);
  }

  async function redeem(customerId: string, rewardType: "classic_cut" | "voucher_30") {
    if (!(await showConfirm("Canjear recompensa", rewardType === "voucher_30" ? "Aplicara vale de S/30." : "Aplicara corte clasico gratis."))) return;
    setRedeemingId(customerId);
    const response = await fetch(`/api/control/rewards/${customerId}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardType })
    });
    const data = await response.json();
    setRedeemingId("");
    if (!response.ok) return showError("No se pudo canjear", data.error ?? "Sin rewards disponibles.");
    await load();
    await showSuccess("Reward canjeado");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Rewards</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Cada 6 atenciones validas genera 1 recompensa.</p>
        </div>
        <div className="flex gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Buscar cliente o celular" value={q} onChange={(event) => setQ(event.target.value)} />
          <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={load}>{loading ? "Cargando..." : "Buscar"}</button>
        </div>
      </div>
      <div className="grid gap-3">
        {loading ? <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5 text-sm text-[var(--text-muted)]">Cargando rewards...</div> : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs text-[var(--gold-soft)]">{row.branchName ?? "Sede"}</p>
                <h2 className="text-xl font-semibold">{row.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">{row.phone}</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-5">
                <Metric label="Atenciones" value={String(row.totalVisits)} />
                <Metric label="Progreso" value={`${row.progress} / 6`} />
                <Metric label="Disponibles" value={String(row.availableRewards)} />
                <Metric label="Canjeadas" value={String(row.redeemedRewards)} />
                <Metric label="Ultima" value={row.lastVisitAt ? new Date(row.lastVisitAt).toLocaleDateString("es-PE") : "-"} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm disabled:opacity-50" disabled={row.availableRewards <= 0 || redeemingId === row.id} onClick={() => redeem(row.id, "classic_cut")}><Gift size={15} /> Corte clasico</button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm disabled:opacity-50" disabled={row.availableRewards <= 0 || redeemingId === row.id} onClick={() => redeem(row.id, "voucher_30")}><Gift size={15} /> Vale S/30</button>
              </div>
            </div>
          </article>
        ))}
        {!loading && rows.length === 0 ? <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5 text-sm text-[var(--text-muted)]">Sin clientes con rewards.</div> : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[var(--border-soft)] px-3 py-2"><p className="text-xs text-[var(--text-muted)]">{label}</p><strong>{value}</strong></div>;
}
