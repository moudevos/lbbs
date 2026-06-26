"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatPeruDateTime } from "@/lib/datetime/peru-time";
import type { BarberOption, BranchOption } from "@/lib/reservations/types";
import { showError } from "@/lib/ui/swal";

type DebtEmployee = {
  employeeId: string;
  employeeName: string;
  branchName: string;
  cafeteriaDebt: number;
  productDebt: number;
  manualDebt: number;
  totalPending: number;
  rows: any[];
};

function money(value: unknown) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}

export function EmployeeDebtsManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState("all");
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("pending");
  const [options, setOptions] = useState<{ branches: BranchOption[]; employees: BarberOption[] }>({ branches: [], employees: [] });
  const [metrics, setMetrics] = useState<any>({});
  const [employees, setEmployees] = useState<DebtEmployee[]>([]);
  const [selected, setSelected] = useState<DebtEmployee | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOptions() {
    const response = await fetch("/api/public/reservation-options");
    const data = await response.json();
    setOptions({ branches: data.branches ?? [], employees: data.barbers ?? [] });
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (branchId !== "all") params.set("branch_id", branchId);
    if (employeeId) params.set("employee_id", employeeId);
    params.set("status", status);
    const response = await fetch(`/api/control/liquidations/debts?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar deudas", data.error ?? "Intenta nuevamente.");
    setMetrics(data.metrics ?? {});
    setEmployees(data.employees ?? []);
  }

  useEffect(() => { void loadOptions(); }, []);
  // Reload when debt filters change; load is intentionally kept local to avoid over-memoizing this screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [from, to, branchId, employeeId, status]);

  return <section className="grid gap-5">
    <header className="flex flex-col gap-3">
      <h1 className="sr-only">Deudas de empleados/barberos</h1>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[150px_150px_1fr_1fr_150px_auto]">
        <label className="grid gap-1 text-xs text-[var(--control-muted)]">Inicio<input className="control-input w-full" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-[var(--control-muted)]">Fin<input className="control-input w-full" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <select className="control-input w-full" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="all">Todas las sedes</option>
          {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select className="control-input w-full" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          <option value="">Todos los empleados</option>
          {options.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
        <select className="control-input w-full" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="pending">Pendientes</option>
        </select>
        <button className="control-primary-button inline-flex items-center gap-2 rounded-lg px-4 py-2" onClick={load}><Search size={16} /> Buscar</button>
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Deuda total pendiente" value={money(metrics.totalPending)} />
      <Metric label="Cafeteria/snacks" value={money(metrics.cafeteriaPending)} />
      <Metric label="Productos" value={money(metrics.productPending)} />
      <Metric label="Manual/adelantos" value={money(metrics.manualPending)} />
      <Metric label="Empleados con deuda" value={String(metrics.employeesWithDebt ?? 0)} />
    </div>

    <section className="control-surface overflow-hidden rounded-xl border border-[var(--control-border)]">
      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[var(--control-muted)]"><Loader2 className="animate-spin" size={18} /> Cargando deudas...</div> :
        employees.length === 0 ? <div className="p-8 text-center text-sm text-[var(--control-muted)]">No hay deuda pendiente para los filtros actuales.</div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="control-surface-muted text-xs uppercase text-[var(--control-muted)]"><tr>{["Empleado","Sede","Cafeteria","Productos","Manual","Total pendiente","Accion"].map((item) => <th key={item} className="p-3">{item}</th>)}</tr></thead><tbody>{employees.map((row) => <tr key={row.employeeId} className="border-t border-[var(--control-border)]"><td className="p-3 font-semibold">{row.employeeName}</td><td className="p-3">{row.branchName}</td><td className="p-3">{money(row.cafeteriaDebt)}</td><td className="p-3">{money(row.productDebt)}</td><td className="p-3">{money(row.manualDebt)}</td><td className="p-3 font-semibold text-[var(--gold-soft)]">{money(row.totalPending)}</td><td className="p-3"><button className="rounded-lg border border-[var(--control-border)] px-3 py-1.5 text-xs" onClick={() => setSelected(row)}>Ver detalle</button></td></tr>)}</tbody></table></div>}
    </section>

    {selected ? <DebtDetailModal employee={selected} onClose={() => setSelected(null)} /> : null}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="control-surface rounded-xl border border-[var(--control-border)] p-4"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-2 text-xl font-semibold text-[var(--gold-soft)]">{value}</p></article>;
}

function DebtDetailModal({ employee, onClose }: { employee: DebtEmployee; onClose: () => void }) {
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4">
    <div className="control-surface max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--control-border)] p-5">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{employee.employeeName}</h2><p className="text-sm text-[var(--control-muted)]">{employee.branchName} - pendiente {money(employee.totalPending)}</p></div><button className="rounded-lg border border-[var(--control-border)] px-3 py-2" onClick={onClose}>Cerrar</button></div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--control-border)]">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="control-surface-muted text-xs uppercase text-[var(--control-muted)]"><tr>{["Fecha","Tipo","Producto/nota","Total","Registrado por","Estado"].map((item) => <th key={item} className="p-3">{item}</th>)}</tr></thead><tbody>{employee.rows.map((row) => <tr key={row.id} className="border-t border-[var(--control-border)]"><td className="p-3">{formatPeruDateTime(row.created_at)}</td><td className="p-3">{row.movement_type}</td><td className="p-3">{row.metadata?.product_name ?? row.reason ?? row.notes ?? "-"}</td><td className="p-3">{money(row.total_amount)}</td><td className="p-3">{row.creator ? `${row.creator.first_name ?? ""} ${row.creator.last_name ?? ""}`.trim() : "-"}</td><td className="p-3">{row.status}</td></tr>)}</tbody></table>
      </div>
    </div>
  </div>;
}
