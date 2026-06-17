"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Calculator, ReceiptText } from "lucide-react";
import type { BarberOption, BranchOption } from "@/lib/reservations/types";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import { TableSkeleton } from "@/components/ui/loading-state";

type Summary = Record<string, number>;
type Row = Record<string, any>;

const summaryMeta: Record<string, { label: string; format: "money" | "percent" | "number" }> = {
  grossProduction: { label: "Produccion bruta de servicios", format: "money" },
  productionDeductions: { label: "Deducciones aplicadas", format: "money" },
  calculatedProduction: { label: "Produccion neta calculada", format: "money" },
  assignedPercentage: { label: "Porcentaje asignado", format: "percent" },
  serviceEarnings: { label: "Ganancia por servicios", format: "money" },
  productCredits: { label: "Creditos por productos", format: "money" },
  bonuses: { label: "Bonos", format: "money" },
  totalLiquidation: { label: "Total a liquidar", format: "money" }
};

export function LiquidationsManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState("all");
  const [barberId, setBarberId] = useState("");
  const [options, setOptions] = useState<{ branches: BranchOption[]; barbers: BarberOption[] }>({ branches: [], barbers: [] });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [liquidations, setLiquidations] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadOptions() {
    const response = await fetch("/api/public/reservation-options");
    const data = await response.json();
    setOptions({ branches: data.branches ?? [], barbers: data.barbers ?? [] });
  }

  async function calculate() {
    if (!barberId) return showError("Barbero requerido", "Selecciona un barbero para calcular.");
    setLoading(true);
    const params = new URLSearchParams({ from, to, barber_id: barberId, branch_id: branchId });
    const response = await fetch(`/api/control/liquidations?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo calcular", data.error ?? "Intenta nuevamente.");
    setSummary(data.summary);
    setRows(data.rows ?? []);
    setLiquidations(data.liquidations ?? []);
  }

  async function createDraft() {
    if (!summary || !(await showConfirm("Generar borrador", "Se copiara el calculo actual a una liquidacion."))) return;
    const response = await fetch("/api/control/liquidations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, barberId, branchId })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo generar", data.error ?? "Revisa el periodo.");
    await calculate();
    await showSuccess("Liquidacion generada");
  }

  async function changeStatus(id: string, status: string) {
    if (!(await showConfirm(`Cambiar a ${status}`, "La liquidacion quedara auditada."))) return;
    const response = await fetch(`/api/control/liquidations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo actualizar", data.error ?? "Intenta nuevamente.");
    await calculate();
  }

  useEffect(() => {
    loadOptions();
  }, []);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Liquidaciones</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Caja real, produccion y liquidacion son conceptos separados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="all">Todas las sedes</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">Barbero</option>
            {options.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={calculate}><Calculator size={16} /> Calcular</button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-4 py-2" onClick={createDraft}><ReceiptText size={16} /> Borrador</button>
          <a className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/api/control/reports/liquidations/export">Exportar CSV</a>
        </div>
      </div>
      {loading ? <TableSkeleton /> : null}
      {summary ? <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">{Object.entries(summary).map(([key, value]) => <Metric key={key} label={summaryMeta[key]?.label ?? key} value={value} format={summaryMeta[key]?.format ?? "money"} />)}</div> : null}
      {liquidations.length ? <div className="grid gap-2">{liquidations.map((item) => <article key={item.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span>{item.status} - S/ {Number(item.total_liquidation).toFixed(2)}</span><div className="flex gap-2"><button className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs" onClick={() => changeStatus(item.id, "approved")}>Aprobar</button><button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs" onClick={() => changeStatus(item.id, "paid")}><BadgeCheck size={14} /> Pagado</button></div></div></article>)}</div> : null}
      {rows.length ? <div className="overflow-x-auto rounded-lg border border-[var(--border-soft)] bg-black/35"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-[var(--gold-soft)]"><tr><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Descripcion</th><th className="p-3">Bruto</th><th className="p-3">Desc.</th><th className="p-3">Produccion</th><th className="p-3">%</th><th className="p-3">Ganancia</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[var(--border-soft)]"><td className="p-3">{new Date(row.counted_at).toLocaleDateString("es-PE")}</td><td className="p-3">{row.entry_type}</td><td className="p-3">{row.description}</td><td className="p-3">S/ {Number(row.gross_amount).toFixed(2)}</td><td className="p-3">S/ {Number(row.deduction_amount).toFixed(2)}</td><td className="p-3">S/ {Number(row.production_amount).toFixed(2)}</td><td className="p-3">{Number(row.percentage).toFixed(2)}%</td><td className="p-3">S/ {Number(row.barber_earning).toFixed(2)}</td></tr>)}</tbody></table></div> : null}
    </section>
  );
}

function Metric({ label, value, format }: { label: string; value: number; format: "money" | "percent" | "number" }) {
  const rendered = format === "percent" ? `${Number(value ?? 0).toFixed(2)}%` : format === "number" ? String(Math.trunc(Number(value ?? 0))) : `S/ ${Number(value ?? 0).toFixed(2)}`;
  return <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 font-semibold text-[var(--gold)]">{rendered}</p></div>;
}
