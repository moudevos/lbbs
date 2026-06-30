"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatPeruTime, toPeruDate } from "@/lib/datetime/peru-time";
import type { BranchOption } from "@/lib/reservations/types";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";

type CashTab = "Resumen" | "Movimientos" | "Cierre";

export function CashDashboard() {
  const [date, setDate] = useState(toPeruDate());
  const [branchId, setBranchId] = useState("all");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CashTab>("Resumen");
  const [data, setData] = useState<any>(null);
  const [closure, setClosure] = useState<any>(null);
  const [countedCash, setCountedCash] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closureBusy, setClosureBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ date, branch_id: branchId, status });
    if (method) params.set("payment_method", method);
    if (search.trim()) params.set("search", search.trim());
    const [summaryRes, optionsRes, closureRes] = await Promise.all([
      fetch(`/api/control/cash/summary?${params}`, { cache: "no-store" }),
      fetch("/api/public/reservation-options"),
      fetch(`/api/control/cash/closure?date=${date}&branch_id=${branchId}`)
    ]);
    const summary = await summaryRes.json();
    setLoading(false);
    if (!summaryRes.ok) {
      await showError("No se pudo cargar caja", summary.error ?? "Sin permiso.");
      return;
    }
    setData(summary);
    if (optionsRes.ok) {
      const opts = await optionsRes.json();
      setBranches(opts.branches ?? []);
    }
    if (closureRes.ok) setClosure((await closureRes.json()).closure);
  }

  useEffect(() => {
    void load();
    const listener = () => void load();
    window.addEventListener("lbbs:operational-realtime", listener);
    return () => window.removeEventListener("lbbs:operational-realtime", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, branchId, method, status]);

  async function closeCash() {
    if (closureBusy || branchId === "all") return;
    if (!(await showConfirm("Cerrar caja", "Luego del cierre no se podran registrar cobros para esta sede y fecha."))) return;
    setClosureBusy(true);
    try {
      const response = await fetch("/api/control/cash/closure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, date, countedCash: Number(countedCash || 0), notes: closureNotes })
      });
      const result = await response.json();
      if (!response.ok) return showError("No se pudo cerrar caja", result.error);
      await load();
      await showSuccess("Caja cerrada");
    } finally {
      setClosureBusy(false);
    }
  }

  async function reopenCash() {
    if (closureBusy || !closure?.id) return;
    if (!(await showConfirm("Reabrir caja", "Esta accion es exclusiva de admin y quedara auditada."))) return;
    setClosureBusy(true);
    try {
      const response = await fetch("/api/control/cash/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closureId: closure.id, reason: closureNotes || "Reapertura operativa" })
      });
      const result = await response.json();
      if (!response.ok) return showError("No se pudo reabrir caja", result.error);
      await load();
      await showSuccess("Caja reabierta");
    } finally {
      setClosureBusy(false);
    }
  }

  const summary = data?.summary ?? {};
  const paymentMethods = summary.paymentMethods ?? {};
  const movements = data?.movements ?? [];

  return (
    <section className="grid min-w-0 gap-4">
      <h1 className="sr-only">Caja</h1>
      <div className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4">
        <div className="grid gap-2 md:grid-cols-[150px_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <input className="control-input min-w-0" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className="control-input min-w-0" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="all">Todas las sedes</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select className="control-input min-w-0" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">Todos los metodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="mixto">Mixto</option>
          </select>
          <select className="control-input min-w-0" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="pagado">Pagadas</option>
            <option value="anulado">Anuladas</option>
          </select>
          <a className="rounded-lg border border-[var(--control-border)] px-4 py-2 text-sm" href={`/api/control/reports/cash/export?date=${date}&branch_id=${branchId}`}>Exportar XLSX</a>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="control-input max-w-sm" placeholder="Buscar cliente o celular" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button className="rounded-xl border border-[var(--control-border)] px-4 py-2" onClick={load}>Buscar</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["Resumen", "Movimientos", "Cierre"] as CashTab[]).map((item) => <button key={item} className={`rounded-full border px-4 py-2 text-sm ${tab === item ? "border-[var(--control-primary-border)] bg-[var(--control-primary-soft)] text-[var(--control-primary)]" : "border-[var(--control-border)] text-[var(--control-muted)]"}`} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {loading ? <Skeleton /> : null}
      {!loading && tab === "Resumen" ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Total vendido" value={money(summary.totalSold)} />
            <Metric label="Total cobrado" value={money(summary.totalCollected)} />
            <Metric label="Servicios" value={money(summary.servicesTotal)} />
            <Metric label="Productos" value={money(summary.productsTotal)} />
            <Metric label="Snacks / cafeteria" value={money(summary.snacksTotal)} />
            <Metric label="Anulados" value={money(summary.voidedTotal)} />
            <Metric label="Efectivo" value={money(paymentMethods.cash)} />
            <Metric label="QR / Yape / Plin" value={money(paymentMethods.qr)} />
            <Metric label="Tarjeta" value={money(paymentMethods.card)} />
            <Metric label="Transferencia" value={money(paymentMethods.transfer)} />
            <Metric label="Mixto" value={money(paymentMethods.mixed)} />
            <Metric label="Diferencia caja" value={closure ? money(closure.difference) : "-"} />
          </div>
          <Panel title="Produccion estimada">
            <p className="text-2xl font-semibold text-[var(--control-primary)]">{money(summary.estimatedBarberProduction)}</p>
            <p className="mt-1 text-sm text-[var(--control-muted)]">Informativo. No representa egreso de caja.</p>
          </Panel>
        </div>
      ) : null}

      {!loading && tab === "Movimientos" ? (
        <Panel title="Movimientos">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--control-primary)]"><tr><th className="p-3">Hora</th><th className="p-3">Cliente</th><th className="p-3">Tipo</th><th className="p-3">Categoria</th><th className="p-3">Monto</th><th className="p-3">Metodo</th><th className="p-3">Estado</th><th className="p-3">Barbero</th><th className="p-3">Acciones</th></tr></thead>
              <tbody>{movements.map((row: any) => <tr key={row.id} className="border-t border-[var(--control-border)]"><td className="p-3">{formatTime(row.time)}</td><td className="p-3">{row.customer}</td><td className="p-3">{row.type}</td><td className="p-3">{row.category}</td><td className="p-3">{money(row.amount)}</td><td className="p-3">{row.paymentMethod}</td><td className="p-3">{row.status}</td><td className="p-3">{row.barber}</td><td className="p-3"><Link className="rounded-lg border border-[var(--control-border)] px-3 py-2 text-xs" href={`/app/control/atenciones/${row.id}`}>Ver</Link></td></tr>)}</tbody>
            </table>
          </div>
          {movements.length === 0 ? <p className="text-sm text-[var(--control-muted)]">Sin movimientos para el filtro.</p> : null}
        </Panel>
      ) : null}

      {!loading && tab === "Cierre" ? (
        <Panel title="Cierre de caja">
          {branchId === "all" ? (
            <p className="text-sm text-[var(--control-muted)]">Selecciona una sede para consultar o cerrar su caja diaria.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <p className="text-sm">Estado: <strong className="text-[var(--control-primary)]">{closure?.status ?? "abierta"}</strong></p>
                <p className="text-sm text-[var(--control-muted)]">Efectivo esperado: {money(summary.expectedCash)}</p>
                <p className="text-sm text-[var(--control-muted)]">Efectivo contado: {closure ? money(closure.counted_cash) : "Pendiente"}</p>
                <p className="text-sm text-[var(--control-muted)]">Diferencia: {closure ? money(closure.difference) : "Pendiente"}</p>
                <input className="control-input" type="number" placeholder="Efectivo contado" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} />
                <textarea className="control-input" placeholder="Observacion o motivo de reapertura" value={closureNotes} onChange={(event) => setClosureNotes(event.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                {closure?.status === "closed" ? (
                  <button className="inline-flex items-center gap-2 rounded-lg border border-amber-400/50 px-4 py-2 text-amber-100 disabled:opacity-60" disabled={closureBusy} onClick={reopenCash}>
                    {closureBusy ? <Loader2 size={16} className="animate-spin" /> : null} Reabrir caja
                  </button>
                ) : (
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--control-primary)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={closureBusy || Number(data?.pendingTickets?.length ?? 0) > 0} onClick={closeCash}>
                    {closureBusy ? <Loader2 size={16} className="animate-spin" /> : null} Cerrar caja
                  </button>
                )}
              </div>
            </div>
          )}
        </Panel>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-3"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-1 truncate text-xl font-semibold text-[var(--control-text)]">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 grid min-w-0 gap-2">{children}</div></section>;
}

function Skeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)]" />)}</div>;
}

function money(value: unknown) {
  return value === "-" ? "-" : `S/ ${Number(value ?? 0).toFixed(2)}`;
}

function formatTime(value: string) {
  return formatPeruTime(value);
}
