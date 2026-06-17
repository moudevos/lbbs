"use client";

import { useEffect, useState } from "react";
import type { BarberOption, BranchOption } from "@/lib/reservations/types";
import { showError } from "@/lib/ui/swal";

type Summary = {
  serviceGross: number;
  deductions: number;
  serviceProduction: number;
  barberEarnings: number;
  productCredits: number;
  bonuses: number;
  estimatedPay: number;
};

type Row = Record<string, any>;

export function ProductionReport() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState("all");
  const [barberId, setBarberId] = useState("");
  const [type, setType] = useState("all");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<{ branches: BranchOption[]; barbers: BarberOption[] }>({ branches: [], barbers: [] });

  async function load() {
    const params = new URLSearchParams({ from, to, type });
    params.set("branch_id", branchId);
    if (barberId) params.set("barber_id", barberId);
    const response = await fetch(`/api/control/production?${params}`);
    const data = await response.json();
    if (!response.ok) return showError("No se pudo cargar produccion", data.error ?? "Intenta nuevamente.");
    setSummary(data.summary);
    setRows(data.rows ?? []);
  }

  async function loadOptions() {
    const response = await fetch("/api/public/reservation-options");
    const data = await response.json();
    setOptions({ branches: data.branches ?? [], barbers: data.barbers ?? [] });
  }

  useEffect(() => {
    loadOptions();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Produccion</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Ventas reales son caja; produccion y ganancia son calculos internos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="all">Todas las sedes</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">Todos los barberos/vendedores</option>
            {options.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">Todos</option>
            <option value="services">Servicios</option>
            <option value="products">Productos</option>
            <option value="bonuses">Bonos</option>
          </select>
          <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={load}>Filtrar</button>
          <a className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href={`/api/control/reports/production/export?from=${from}&to=${to}&type=${type}&branch_id=${branchId}${barberId ? `&barber_id=${barberId}` : ""}`}>Exportar CSV</a>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Bruta servicios" value={summary.serviceGross} />
          <Metric label="Descuentos" value={summary.deductions} />
          <Metric label="Produccion" value={summary.serviceProduction} />
          <Metric label="Ganancia" value={summary.barberEarnings} />
          <Metric label="Creditos productos" value={summary.productCredits} />
          <Metric label="Bonos" value={summary.bonuses} />
          <Metric label="Total estimado" value={summary.estimatedPay} strong />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-[var(--border-soft)] bg-black/35">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--gold-soft)]">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Barbero/vendedor</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Descripcion</th>
              <th className="p-3">Bruto</th>
              <th className="p-3">Desc.</th>
              <th className="p-3">Produccion</th>
              <th className="p-3">%</th>
              <th className="p-3">Ganancia</th>
              <th className="p-3">Sede</th>
              <th className="p-3">Atencion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border-soft)]">
                <td className="p-3">{new Date(row.counted_at).toLocaleDateString("es-PE")}</td>
                <td className="p-3">{row.entry_type === "product_credit" ? row.sellerName ?? row.barberName : row.barberName}</td>
                <td className="p-3">{row.entry_type}</td>
                <td className="p-3">{row.description}</td>
                <td className="p-3">S/ {Number(row.gross_amount).toFixed(2)}</td>
                <td className="p-3">S/ {Number(row.deduction_amount).toFixed(2)}</td>
                <td className="p-3">S/ {Number(row.production_amount).toFixed(2)}</td>
                <td className="p-3">{Number(row.percentage).toFixed(2)}%</td>
                <td className="p-3">S/ {Number(row.barber_earning).toFixed(2)}</td>
                <td className="p-3">{row.branchName}</td>
                <td className="p-3">{row.service_order_id?.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${strong ? "text-[var(--gold)]" : "text-white"}`}>S/ {Number(value ?? 0).toFixed(2)}</p>
    </div>
  );
}
