"use client";

import { ReceiptText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentMethodBadge } from "./payment-method-badge";
import { showConfirm, showError } from "@/lib/ui/swal";
import { toPeruDate } from "@/lib/datetime/peru-time";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";

type Order = Record<string, any>;

export function ServiceOrdersManager({ mine = false }: { mine?: boolean }) {
  const today = toPeruDate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [role, setRole] = useState("");
  const [date, setDate] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ from: date, to: dateTo, branch_id: localStorage.getItem("lbbs:branchScope") ?? "all" });
    if (status) params.set("status", status);
    const [ordersResponse, meResponse] = await Promise.all([fetch(`/api/control/service-orders?${params}`), fetch("/api/control/me")]);
    const data = await ordersResponse.json();
    const me = await meResponse.json();
    setLoading(false);
    if (!ordersResponse.ok) return showError("No se pudo cargar", data.error);
    setOrders(data.serviceOrders ?? []);
    setRole(me.employee?.role ?? "");
  }

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("branch-scope-change", refresh);
    window.addEventListener("lbbs:operational-realtime", refresh);
    return () => {
      window.removeEventListener("branch-scope-change", refresh);
      window.removeEventListener("lbbs:operational-realtime", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, dateTo, status]);

  async function voidOrder(id: string) {
    if (!(await showConfirm("Anular atencion", "La atencion quedara anulada y auditada."))) return;
    const response = await fetch(`/api/control/service-orders/${id}/void`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo anular", data.error);
    await load();
  }

  return (
    <section className="grid min-w-0 gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-3xl font-semibold">{mine ? "Mis servicios" : "Atenciones"}</h1><p className="mt-1 text-sm text-[var(--text-muted)]">Por defecto se muestran las atenciones activas de hoy.</p></div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:justify-end">
          <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => { setDate(today); setDateTo(today); }}>Hoy</button>
          <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => { const value = toPeruDate(new Date(Date.now() - 86400000)); setDate(value); setDateTo(value); }}>Ayer</button>
          <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => { setDate(toPeruDate(new Date(Date.now() - 6 * 86400000))); setDateTo(today); }}>Esta semana</button>
          <input className="control-input min-w-0 xl:w-[145px]" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <input className="control-input min-w-0 xl:w-[145px]" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <select className="control-input min-w-0 xl:w-[145px]" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Activas</option><option value="pendiente_pago">Pendientes</option><option value="pagado">Pagadas</option><option value="anulado">Anuladas</option><option value="all">Todas</option></select>
          {!mine && role !== "barbero" ? <Link className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" href="/app/control/atenciones/nueva">Nueva atencion</Link> : null}
        </div>
      </div>
      {loading ? <p className="text-sm text-[var(--text-muted)]">Cargando atenciones...</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {orders.map((order) => {
          const customer = first(order.customers);
          const barber = first(order.employees);
          const rewards = first(customer?.customer_reward_accounts);
          const itemNames = (order.service_order_items ?? []).filter((item: any) => !["reward_discount", "discount"].includes(item.item_type)).map((item: any) => item.name ?? item.description).filter(Boolean);
          const generic = isGenericCustomerPhone(customer?.phone);
          return (
            <article key={order.id} className={`flex min-h-[210px] min-w-0 flex-col rounded-xl border bg-[var(--control-surface)] p-4 ${order.status === "anulado" ? "border-red-400/40 opacity-75" : "border-[var(--control-border)]"}`}>
              <div className="flex items-start justify-between gap-3"><div><p className={order.status === "anulado" ? "text-xs uppercase text-red-300" : "text-xs uppercase text-[var(--gold-soft)]"}>{order.status}</p><h2 className="mt-1 font-semibold">{generic ? "Cliente generico" : customer?.full_name ?? "Cliente"}</h2><p className="text-sm text-[var(--text-muted)]">{itemNames.join(" + ") || "Sin items"} - {barber ? `${barber.first_name} ${barber.last_name}` : "Sin barbero"}</p></div><strong className="text-[var(--gold)]">S/ {Number(order.total ?? 0).toFixed(2)}</strong></div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]"><span>{generic ? "Sin rewards" : `Rewards: ${rewards?.available_rewards ?? 0}`}</span>{(order.payment_details ?? []).map((payment: any, index: number) => <PaymentMethodBadge key={index} method={payment.method} />)}</div>
              <div className="mt-4 flex flex-wrap gap-2"><Link className="rounded-lg border border-[var(--gold)] px-3 py-2 text-sm text-[var(--gold-soft)]" href={`/app/control/atenciones/${order.id}`}>Ver detalle</Link>{!mine && !["pagado", "anulado"].includes(order.status) ? <Link className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={`/app/control/atenciones/${order.id}?focus=payment`}><ReceiptText size={16} /> Pagar</Link> : null}{!mine && order.status !== "anulado" ? <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm text-red-200" onClick={() => voidOrder(order.id)}><Trash2 size={16} /> Anular</button> : null}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
