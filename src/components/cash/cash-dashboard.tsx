"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { PaymentMethodBadge } from "@/components/service-orders/payment-method-badge";
import type { BarberOption, BranchOption } from "@/lib/reservations/types";
import { showError } from "@/lib/ui/swal";

export function CashDashboard() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState("all");
  const [barberId, setBarberId] = useState("");
  const [method, setMethod] = useState("");
  const [data, setData] = useState<any>(null);
  const [options, setOptions] = useState<{ branches: BranchOption[]; barbers: BarberOption[] }>({ branches: [], barbers: [] });

  async function load() {
    const params = new URLSearchParams({ date, branch_id: branchId });
    if (barberId) params.set("barber_id", barberId);
    if (method) params.set("method", method);
    const [summaryRes, optionsRes] = await Promise.all([fetch(`/api/control/cash/summary?${params}`), fetch("/api/public/reservation-options")]);
    const summary = await summaryRes.json();
    const opts = await optionsRes.json();
    if (!summaryRes.ok) {
      await showError("No se pudo cargar caja", summary.error ?? "Sin permiso.");
      return;
    }
    setData(summary);
    setOptions({ branches: opts.branches ?? [], barbers: opts.barbers ?? [] });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, branchId, barberId, method]);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Caja base</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Ventas pagadas, metodos, ranking y tickets del dia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="all">Todas las sedes</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">Todos los barberos</option>
            {options.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">Todos los metodos</option>
            <option value="efectivo">efectivo</option>
            <option value="yape">yape</option>
            <option value="plin">plin</option>
            <option value="tarjeta">tarjeta</option>
            <option value="transferencia">transferencia</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Total vendido" value={`S/ ${Number(data?.totalSold ?? 0).toFixed(2)}`} />
        <Metric label="Atenciones pagadas" value={String(data?.attentionCount ?? 0)} />
        <Metric label="Pendiente de pago" value={`S/ ${Number(data?.pendingTotal ?? 0).toFixed(2)}`} />
        <Metric label="Servicios realizados" value={String(data?.serviceCount ?? 0)} />
        <Metric label="Productos vendidos" value={String(data?.productsSold ?? 0)} />
        <Metric label="Servicios anulados" value={String(data?.voidedCount ?? 0)} />
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
  return <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4"><p className="text-sm text-[var(--text-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 grid gap-2">{children}</div></section>;
}
