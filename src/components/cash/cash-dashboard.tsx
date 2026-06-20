"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PaymentMethodBadge } from "@/components/service-orders/payment-method-badge";
import type { BarberOption, BranchOption } from "@/lib/reservations/types";
import { Loader2 } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";

export function CashDashboard() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState("all");
  const [barberId, setBarberId] = useState("");
  const [method, setMethod] = useState("");
  const [data, setData] = useState<any>(null);
  const [closure, setClosure] = useState<any>(null);
  const [countedCash, setCountedCash] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closureBusy, setClosureBusy] = useState(false);
  const [options, setOptions] = useState<{ branches: BranchOption[]; barbers: BarberOption[] }>({ branches: [], barbers: [] });

  async function load() {
    const params = new URLSearchParams({ date, branch_id: branchId });
    if (barberId) params.set("barber_id", barberId);
    if (method) params.set("method", method);
    const [summaryRes, optionsRes, closureRes] = await Promise.all([
      fetch(`/api/control/cash/summary?${params}`),
      fetch("/api/public/reservation-options"),
      fetch(`/api/control/cash/closure?date=${date}&branch_id=${branchId}`)
    ]);
    const summary = await summaryRes.json();
    const opts = await optionsRes.json();
    if (!summaryRes.ok) {
      await showError("No se pudo cargar caja", summary.error ?? "Sin permiso.");
      return;
    }
    setData(summary);
    setOptions({ branches: opts.branches ?? [], barbers: opts.barbers ?? [] });
    if (closureRes.ok) setClosure((await closureRes.json()).closure);
  }

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("lbbs:operational-realtime", listener);
    return () => window.removeEventListener("lbbs:operational-realtime", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, branchId, barberId, method]);

  async function closeCash() {
    if (closureBusy || branchId === "all") return;
    if (!(await showConfirm("Cerrar caja", "Luego del cierre no se podran registrar cobros para esta sede y fecha."))) return;
    setClosureBusy(true);
    try {
      const response = await fetch("/api/control/cash/closure", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
        method: "POST", headers: { "Content-Type": "application/json" },
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

  return (
    <section className="grid min-w-0 gap-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(0,980px)] xl:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Caja base</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Ventas pagadas, metodos, ranking y tickets del dia.</p>
        </div>
        <div className="grid min-w-0 gap-2 md:grid-cols-[150px_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <input className="control-input min-w-0" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className="control-input min-w-0" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="all">Todas las sedes</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select className="control-input min-w-0" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">Todos los barberos</option>
            {options.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <select className="control-input min-w-0" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">Todos los metodos</option>
            <option value="efectivo">efectivo</option>
            <option value="yape">yape</option>
            <option value="plin">plin</option>
            <option value="tarjeta">tarjeta</option>
            <option value="transferencia">transferencia</option>
          </select>
          <a className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href={`/api/control/reports/cash/export?date=${date}&branch_id=${branchId}`}>Exportar XLSX</a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Bruto total del dia" value={`S/ ${Number(data?.grossTotal ?? 0).toFixed(2)}`} />
        <Metric label="Total cobrado" value={`S/ ${Number(data?.totalSold ?? 0).toFixed(2)}`} />
        <Metric label="Atenciones pagadas" value={String(data?.attentionCount ?? 0)} />
        <Metric label="Pendiente de pago" value={`S/ ${Number(data?.pendingTotal ?? 0).toFixed(2)}`} />
        <Metric label="Anulado" value={`S/ ${Number(data?.voidedTotal ?? 0).toFixed(2)}`} />
        <Metric label="Servicios anulados" value={String(data?.voidedCount ?? 0)} />
      </div>

      <Panel title="Cierre de caja">
        {branchId === "all" ? (
          <p className="text-sm text-[var(--text-muted)]">Selecciona una sede para consultar o cerrar su caja diaria.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <p className="text-sm">Estado: <strong className="text-[var(--gold)]">{closure?.status ?? "abierta"}</strong></p>
              <p className="text-sm text-[var(--text-muted)]">Efectivo esperado: S/ {Number(data?.byMethod?.find((item: any) => item.method === "efectivo")?.total ?? 0).toFixed(2)}</p>
              <input className="control-input" type="number" placeholder="Efectivo contado" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} />
              <textarea className="control-input" placeholder="Notas o motivo de reapertura" value={closureNotes} onChange={(event) => setClosureNotes(event.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              {closure?.status === "closed" ? (
                <button className="inline-flex items-center gap-2 rounded-lg border border-amber-400/50 px-4 py-2 text-amber-100 disabled:opacity-60" disabled={closureBusy} onClick={reopenCash}>
                  {closureBusy ? <Loader2 size={16} className="animate-spin" /> : null} Reabrir caja
                </button>
              ) : (
                <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={closureBusy || Number(data?.pendingTickets?.length ?? 0) > 0} onClick={closeCash}>
                  {closureBusy ? <Loader2 size={16} className="animate-spin" /> : null} Cerrar caja
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Total bruto de servicios" value={`S/ ${Number(data?.serviceGross ?? 0).toFixed(2)}`} />
        <Metric label="Cantidad de servicios" value={String(data?.serviceCount ?? 0)} />
        <Metric label="Deducciones de produccion" value={`S/ ${Number(data?.productionDeductions ?? 0).toFixed(2)}`} />
        <Metric label="Produccion neta servicios" value={`S/ ${Number(data?.serviceProduction ?? 0).toFixed(2)}`} />
        <Metric label="Total cafeteria/snacks" value={`S/ ${Number(data?.snackTotal ?? 0).toFixed(2)}`} />
        <Metric label="Cantidad snacks" value={String(data?.snackCount ?? 0)} />
        <Metric label="Total productos barberia" value={`S/ ${Number(data?.barberProductTotal ?? 0).toFixed(2)}`} />
        <Metric label="Cantidad productos barberia" value={String(data?.barberProductCount ?? 0)} />
        <Metric label="Creditos vendedores" value={`S/ ${Number(data?.sellerCredits ?? 0).toFixed(2)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Total por metodo">
          {(data?.byMethod ?? []).map((item: any) => (
            <div key={item.method} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2">
              <PaymentMethodBadge method={item.method} />
              <strong>S/ {Number(item.total).toFixed(2)}</strong>
            </div>
          ))}
        </Panel>
        <Panel title="Ranking por barbero">
          {(data?.byBarber ?? []).map((item: any) => (
            <div key={item.name} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm">
              <span>{item.name}</span>
              <span>{item.count} servicios - S/ {Number(item.total).toFixed(2)}</span>
            </div>
          ))}
        </Panel>
      </div>
      <Panel title="Atenciones por origen">
        {(data?.byOrigin ?? []).map((item: any) => (
          <div key={item.origin} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm">
            <span>{item.origin}</span>
            <span>{item.count} atenciones - S/ {Number(item.total).toFixed(2)}</span>
          </div>
        ))}
      </Panel>

      <Panel title="Atenciones pendientes de cobro">
        <div className="grid gap-2">
          {(data?.pendingTickets ?? []).map((ticket: any) => (
            <article key={ticket.id} className="rounded-lg border border-[var(--border-soft)] bg-black/25 p-3 text-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{ticket.customers?.full_name ?? "Cliente"}</p>
                  <p className="text-[var(--text-muted)]">
                    {ticket.branches?.name ?? "Sede"} - {ticket.employees ? `${ticket.employees.first_name ?? ""} ${ticket.employees.last_name ?? ""}`.trim() : "Sin barbero"} - {ticket.origin}
                  </p>
                  <p className="text-[var(--text-muted)]">{(ticket.service_order_items ?? []).map((item: any) => item.name).join(", ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="text-[var(--gold)]">S/ {Number(ticket.total ?? 0).toFixed(2)}</strong>
                  <Link className="rounded-lg bg-[var(--gold)] px-3 py-2 font-semibold text-black" href={`/app/control/atenciones/${ticket.id}?focus=payment`}>Pagar</Link>
                </div>
              </div>
            </article>
          ))}
          {(data?.pendingTickets ?? []).length === 0 ? <p className="text-sm text-[var(--text-muted)]">No hay atenciones pendientes de cobro.</p> : null}
        </div>
      </Panel>

      <Panel title="Tickets del dia">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(data?.tickets ?? []).map((ticket: any) => (
            <article key={ticket.id} className="rounded-lg border border-[var(--border-soft)] bg-black/25 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{ticket.customers?.full_name ?? "Cliente"}</p>
                  <p className="text-[var(--text-muted)]">{ticket.services?.name ?? "Servicio"}</p>
                </div>
                <strong className="text-[var(--gold)]">S/ {Number(ticket.total ?? 0).toFixed(2)}</strong>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{ticket.status}</p>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-3"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-1 truncate text-xl font-semibold text-[var(--control-text)]">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 grid min-w-0 gap-2">{children}</div></section>;
}
