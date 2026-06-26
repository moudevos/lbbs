"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Calculator, ReceiptText } from "lucide-react";
import type { BarberOption, BranchOption } from "@/lib/reservations/types";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import { TableSkeleton } from "@/components/ui/loading-state";
import { formatPeruDateTime } from "@/lib/datetime/peru-time";

type Summary = Record<string, number>;
type Row = Record<string, any>;

function money(value: unknown) {
  return Math.max(Math.round(Number(value ?? 0) * 100) / 100, 0);
}

function recalculateRowsWithPercentage(rows: Row[], percentage: number) {
  return rows.map((row) => {
    if (String(row.entry_type ?? "") !== "service") return row;
    const productionAmount = money(row.production_amount);
    return {
      ...row,
      percentage,
      barber_earning: money((productionAmount * percentage) / 100)
    };
  });
}

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
  const [assignedPercentageOverride, setAssignedPercentageOverride] = useState("");
  const [productDebtApplied, setProductDebtApplied] = useState("");
  const [manualDebtApplied, setManualDebtApplied] = useState("");

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
    setAssignedPercentageOverride(String(Number(data.summary?.assignedPercentage ?? 0)));
    setProductDebtApplied(String(Number(data.summary?.productDebt ?? 0)));
    setManualDebtApplied(String(Number(data.summary?.manualDebt ?? 0)));
  }

  async function createDraft() {
    if (!summary || !(await showConfirm("Generar borrador", "Se copiara el calculo actual a una liquidacion."))) return;
    const response = await fetch("/api/control/liquidations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        barberId,
        branchId,
        assignedPercentage: Number(assignedPercentageOverride || recalculatedSummary.assignedPercentage || 0),
        productDebtApplied: Number(productDebtApplied || 0),
        manualDebtApplied: Number(manualDebtApplied || 0),
        cafeteriaDebtApplied: Number(summary.cafeteriaDebt ?? 0)
      })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo generar", data.error ?? "Revisa el periodo.");
    await calculate();
    await showSuccess("Liquidacion generada");
  }

  async function closeLiquidation() {
    if (!summary || !(await showConfirm("Cerrar liquidacion", "Se guardara snapshot, se marcaran movimientos como liquidados y se aplicaran las deudas pendientes."))) return;
    const response = await fetch("/api/control/liquidations/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        barberId,
        branchId,
        assignedPercentage: Number(assignedPercentageOverride || recalculatedSummary.assignedPercentage || 0),
        productDebtApplied: Number(productDebtApplied || 0),
        manualDebtApplied: Number(manualDebtApplied || 0),
        cafeteriaDebtApplied: Number(summary.cafeteriaDebt ?? 0)
      })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo cerrar", data.error ?? "Revisa el periodo.");
    await calculate();
    await showSuccess("Liquidacion cerrada");
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

  const assignedPercentage = Number(assignedPercentageOverride || summary?.assignedPercentage || 0);
  const displayRows = recalculateRowsWithPercentage(rows, assignedPercentage);
  const serviceRows = displayRows.filter((row) => ["service", "reward_classic_cut"].includes(String(row.entry_type ?? "")));
  const recalculatedSummary = {
    grossProduction: money(displayRows.reduce((total, row) => total + Number(row.gross_amount ?? 0), 0)),
    productionDeductions: money(displayRows.reduce((total, row) => total + Number(row.deduction_amount ?? 0), 0)),
    calculatedProduction: money(displayRows.reduce((total, row) => total + Number(row.production_amount ?? 0), 0)),
    assignedPercentage,
    serviceEarnings: money(displayRows.filter((row) => String(row.entry_type ?? "") === "service").reduce((total, row) => total + Number(row.barber_earning ?? 0), 0)),
    productCredits: money(displayRows.filter((row) => String(row.entry_type ?? "") === "product_credit").reduce((total, row) => total + Number(row.barber_earning ?? 0), 0)),
    bonuses: money(Number(summary?.bonuses ?? 0)),
    totalLiquidation: 0
  };
  recalculatedSummary.totalLiquidation = money(recalculatedSummary.serviceEarnings + recalculatedSummary.productCredits + recalculatedSummary.bonuses);
  const effectiveProductDebtApplied = Math.min(Number(productDebtApplied || 0), Number(summary?.productDebt ?? 0));
  const effectiveManualDebtApplied = Math.min(Number(manualDebtApplied || 0), Number(summary?.manualDebt ?? 0));
  const netDiscount = Number(summary?.cafeteriaDebt ?? 0) + effectiveProductDebtApplied + effectiveManualDebtApplied;
  const netIncome = Number(recalculatedSummary.totalLiquidation ?? 0);
  const netToPay = netIncome - netDiscount;
  const pdfParams = new URLSearchParams({
    from,
    to,
    barber_id: barberId,
    branch_id: branchId,
    assigned_percentage: String(assignedPercentage),
    product_debt_applied: String(effectiveProductDebtApplied),
    manual_debt_applied: String(effectiveManualDebtApplied)
  });

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="sr-only">Liquidaciones</h1>
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
          <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--gold)] px-4 py-2 text-[var(--gold)]" onClick={closeLiquidation}><BadgeCheck size={16} /> Cerrar</button>
          <a className={`rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm ${!summary || !barberId ? "pointer-events-none opacity-50" : ""}`} href={`/api/control/reports/liquidations/pdf?${pdfParams}`}>PDF sustento</a>
          <a className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/api/control/reports/liquidations/export">Exportar XLSX</a>
        </div>
      </div>
      {loading ? <TableSkeleton /> : null}
      {summary ? (
        <div className="grid gap-4">
          <MetricGroup title="Ingresos" description="Produccion y comisiones calculadas para el periodo no liquidado.">
            <Metric label="Servicios totales" value={serviceRows.length} format="number" tone="neutral" />
            <Metric label="Produccion bruta" value={recalculatedSummary.grossProduction} format="money" tone="income" />
            <Metric label="Produccion neta" value={recalculatedSummary.calculatedProduction} format="money" tone="income" />
            <Metric label="Bonos" value={recalculatedSummary.bonuses} format="money" tone="income" />
            <EditableMetric
              label="% asignado"
              value={assignedPercentageOverride}
              onChange={setAssignedPercentageOverride}
              suffix="%"
              helper="Temporal para este cierre"
              tone="neutral"
            />
          </MetricGroup>

          <MetricGroup title="Descuentos" description="Deudas y descuentos a aplicar sobre la liquidacion.">
            <Metric label="Consumo snacks" value={summary.cafeteriaDebt} format="money" tone="discount" helper="Fijo" />
            <EditableMetric
              label="Productos barberia"
              value={productDebtApplied}
              max={Number(summary.productDebt ?? 0)}
              onChange={setProductDebtApplied}
              prefix="S/"
              helper={`Deuda: S/ ${Number(summary.productDebt ?? 0).toFixed(2)}`}
              tone="discount"
            />
            <EditableMetric
              label="Descuentos manuales"
              value={manualDebtApplied}
              max={Number(summary.manualDebt ?? 0)}
              onChange={setManualDebtApplied}
              prefix="S/"
              helper={`Deuda: S/ ${Number(summary.manualDebt ?? 0).toFixed(2)}`}
              tone="discount"
            />
          </MetricGroup>

          <MetricGroup title="Totales y netos" description="Resultado final antes de cerrar la liquidacion.">
            <Metric label="Neto de ingreso" value={netIncome} format="money" tone="total" />
            <Metric label="Neto de descuento" value={netDiscount} format="money" tone="discount" />
            <Metric label="Neto a pagar" value={netToPay} format="money" tone="pay" featured />
          </MetricGroup>
        </div>
      ) : null}
      {liquidations.length ? <div className="grid gap-2">{liquidations.map((item) => <article key={item.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span>{item.status} - S/ {Number(item.total_liquidation).toFixed(2)}</span><div className="flex gap-2"><button className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs" onClick={() => changeStatus(item.id, "approved")}>Aprobar</button><button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs" onClick={() => changeStatus(item.id, "paid")}><BadgeCheck size={14} /> Pagado</button></div></div></article>)}</div> : null}
      {displayRows.length ? <div className="overflow-x-auto rounded-lg border border-[var(--border-soft)] bg-black/35"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-[var(--gold-soft)]"><tr><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Descripcion</th><th className="p-3">Bruto</th><th className="p-3">Desc.</th><th className="p-3">Produccion</th><th className="p-3">%</th><th className="p-3">Ganancia</th></tr></thead><tbody>{displayRows.map((row) => <tr key={row.id} className="border-t border-[var(--border-soft)]"><td className="p-3">{formatPeruDateTime(row.counted_at)}</td><td className="p-3">{row.entry_type}</td><td className="p-3">{row.description}</td><td className="p-3">S/ {Number(row.gross_amount).toFixed(2)}</td><td className="p-3">S/ {Number(row.deduction_amount).toFixed(2)}</td><td className="p-3">S/ {Number(row.production_amount).toFixed(2)}</td><td className="p-3">{Number(row.percentage).toFixed(2)}%</td><td className="p-3">S/ {Number(row.barber_earning).toFixed(2)}</td></tr>)}</tbody></table></div> : null}
    </section>
  );
}

function MetricGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="control-surface rounded-2xl border border-[var(--control-border)] p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-soft)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--control-muted)]">{description}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  format,
  helper,
  tone = "neutral",
  featured = false
}: {
  label: string;
  value: number;
  format: "money" | "percent" | "number";
  helper?: string;
  tone?: "neutral" | "income" | "discount" | "total" | "pay";
  featured?: boolean;
}) {
  const rendered = format === "percent" ? `${Number(value ?? 0).toFixed(2)}%` : format === "number" ? String(Math.trunc(Number(value ?? 0))) : `S/ ${Number(value ?? 0).toFixed(2)}`;
  const toneClass = {
    neutral: "border-[var(--control-border)] bg-[var(--control-surface-2)] text-[var(--control-text)]",
    income: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    discount: "border-amber-400/25 bg-amber-500/10 text-amber-100",
    total: "border-sky-400/25 bg-sky-500/10 text-sky-100",
    pay: "border-[var(--gold)] bg-[rgba(255,215,0,0.14)] text-[var(--gold)]"
  }[tone];
  return (
    <article className={`rounded-xl border p-4 ${toneClass} ${featured ? "ring-1 ring-[var(--gold)]" : ""}`}>
      <div className="flex min-h-10 items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--control-muted)]">{label}</p>
        {helper ? <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold opacity-85">{helper}</span> : null}
      </div>
      <p className={`mt-3 font-semibold ${featured ? "text-3xl" : "text-2xl"}`}>{rendered}</p>
    </article>
  );
}

function EditableMetric({
  label,
  value,
  onChange,
  prefix,
  suffix,
  helper,
  max,
  tone = "neutral"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
  max?: number;
  tone?: "neutral" | "discount";
}) {
  const toneClass = tone === "discount"
    ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
    : "border-[var(--control-border)] bg-[var(--control-surface-2)] text-[var(--control-text)]";
  function update(next: string) {
    const numeric = Number(next);
    if (Number.isFinite(numeric) && max !== undefined && numeric > max) return onChange(String(max));
    onChange(next);
  }
  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex min-h-10 items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--control-muted)]">{label}</p>
        {helper ? <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold opacity-85">{helper}</span> : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {prefix ? <span className="text-sm font-semibold opacity-80">{prefix}</span> : null}
        <input
          className="control-input h-11 min-w-0 flex-1 text-xl font-semibold"
          type="number"
          min="0"
          max={max}
          step="0.01"
          value={value}
          onChange={(event) => update(event.target.value)}
        />
        {suffix ? <span className="text-sm font-semibold opacity-80">{suffix}</span> : null}
      </div>
    </article>
  );
}
