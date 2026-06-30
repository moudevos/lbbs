"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { formatPeruDateTime, toPeruDate } from "@/lib/datetime/peru-time";
import type { BarberOption, BranchOption, ServiceOption } from "@/lib/reservations/types";
import { showError } from "@/lib/ui/swal";

const tabs = ["Resumen", "Ventas", "Servicios", "Barberos", "Productos", "Clientes", "Horarios pico", "Exportar"] as const;
type Tab = (typeof tabs)[number];

const endpoints: Partial<Record<Tab, string>> = {
  Resumen: "summary",
  Ventas: "sales",
  Servicios: "services",
  Barberos: "barbers",
  Productos: "products",
  Clientes: "customers",
  "Horarios pico": "peak-hours"
};

type Filters = {
  from: string;
  to: string;
  branch_id: string;
  barber_id: string;
  service_id: string;
  category: string;
  payment_method: string;
  status: string;
};

export function AnalyticsDashboard() {
  const today = toPeruDate();
  const initial: Filters = { from: `${today.slice(0, 8)}01`, to: today, branch_id: "all", barber_id: "", service_id: "", category: "", payment_method: "", status: "pagado" };
  const [draft, setDraft] = useState<Filters>(initial);
  const [filters, setFilters] = useState<Filters>(initial);
  const [tab, setTab] = useState<Tab>("Resumen");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ branches: BranchOption[]; barbers: BarberOption[]; services: ServiceOption[] }>({ branches: [], barbers: [], services: [] });
  const query = useMemo(() => new URLSearchParams(filters).toString(), [filters]);

  useEffect(() => {
    fetch("/api/public/reservation-options").then((res) => res.json()).then((json) => {
      setOptions({ branches: json.branches ?? [], barbers: json.barbers ?? [], services: json.services ?? [] });
    }).catch(() => null);
  }, []);

  async function load() {
    const endpoint = endpoints[tab];
    if (!endpoint) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/control/analytics/${endpoint}?${query}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) return showError("No se pudo cargar analisis", json.error ?? "Intenta nuevamente.");
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query]);

  function applyFilters() {
    setFilters(draft);
  }

  function resetFilters() {
    setDraft(initial);
    setFilters(initial);
  }

  return (
    <section className="grid min-w-0 gap-4">
      <h1 className="sr-only">Analisis</h1>
      <div className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Field label="Desde"><input className="control-input" type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></Field>
          <Field label="Hasta"><input className="control-input" type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></Field>
          <Field label="Sede"><select className="control-input" value={draft.branch_id} onChange={(event) => setDraft({ ...draft, branch_id: event.target.value })}><option value="all">Todas</option>{options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
          <Field label="Barbero"><select className="control-input" value={draft.barber_id} onChange={(event) => setDraft({ ...draft, barber_id: event.target.value })}><option value="">Todos</option>{options.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></Field>
          <Field label="Servicio"><select className="control-input" value={draft.service_id} onChange={(event) => setDraft({ ...draft, service_id: event.target.value })}><option value="">Todos</option>{options.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></Field>
          <Field label="Categoria"><select className="control-input" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="">Todas</option><option value="service">Servicios</option><option value="product">Productos</option><option value="snack">Snacks</option></select></Field>
          <Field label="Metodo"><select className="control-input" value={draft.payment_method} onChange={(event) => setDraft({ ...draft, payment_method: event.target.value })}><option value="">Todos</option><option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="plin">Plin</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="mixto">Mixto</option></select></Field>
          <Field label="Estado"><select className="control-input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="pagado">Pagado</option><option value="anulado">Anulado</option><option value="all">Todos</option></select></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="control-primary-action rounded-xl px-4 py-2 font-semibold" onClick={applyFilters}>Aplicar filtros</button>
          <button className="rounded-xl border border-[var(--control-border)] px-4 py-2" onClick={resetFilters}>Limpiar</button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-[var(--control-border)] px-4 py-2" disabled={loading} onClick={load}>{loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Recargar</button>
          <a className="inline-flex items-center gap-2 rounded-xl border border-[var(--control-border)] px-4 py-2" href={`/api/control/analytics/export/xlsx?${query}`}><Download size={16} /> Exportar Excel</a>
          <a className="inline-flex items-center gap-2 rounded-xl border border-[var(--control-border)] px-4 py-2" href={`/api/control/analytics/export/pdf?${query}`}><FileText size={16} /> Exportar PDF</a>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => <button key={item} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${tab === item ? "border-[var(--control-primary-border)] bg-[var(--control-primary-soft)] text-[var(--control-primary)]" : "border-[var(--control-border)] text-[var(--control-muted)]"}`} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {loading ? <Skeleton /> : <TabContent tab={tab} data={data} query={query} />}
    </section>
  );
}

function TabContent({ tab, data, query }: { tab: Tab; data: any; query: string }) {
  if (tab === "Exportar") {
    return <Panel title="Exportar"><p className="text-sm text-[var(--control-muted)]">El PDF es ejecutivo y el Excel contiene el detalle para auditoria operativa.</p><div className="mt-3 flex flex-wrap gap-2"><a className="control-primary-action rounded-xl px-4 py-2 font-semibold" href={`/api/control/analytics/export/xlsx?${query}`}>Descargar Excel</a><a className="rounded-xl border border-[var(--control-border)] px-4 py-2" href={`/api/control/analytics/export/pdf?${query}`}>Descargar PDF ejecutivo</a></div></Panel>;
  }
  if (!data) return <Empty />;
  if (tab === "Resumen") return <Summary data={data} />;
  if (tab === "Ventas") return <Sales data={data} />;
  if (tab === "Servicios") return <TablePanel title="Servicios" rows={data.services ?? []} columns={["service", "quantity", "revenue", "averageTicket", "averageDuration", "mainBranch", "topBarber", "percent"]} />;
  if (tab === "Barberos") return <TablePanel title="Barberos" rows={data.barbers ?? []} columns={["barber", "attentions", "services", "grossProduction", "validProduction", "estimatedPay", "averageTicket", "productsAssociated", "voids", "productionShare"]} />;
  if (tab === "Productos") return <><TablePanel title="Productos" rows={data.products ?? []} columns={["product", "category", "quantitySold", "courtesyQuantity", "revenue", "estimatedCost", "estimatedMargin", "stock", "branch"]} />{data.missingProductCosts ? <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">Hay productos sin costo registrado; el margen puede estar incompleto.</p> : null}</>;
  if (tab === "Clientes") return <Clients data={data.customers} />;
  if (tab === "Horarios pico") return <PeakHours data={data.peakHours} />;
  return <Empty />;
}

function Summary({ data }: { data: any }) {
  const summary = data.summary ?? {};
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total vendido" value={money(summary.totalSold)} />
        <Metric label="Total cobrado" value={money(summary.totalCollected)} />
        <Metric label="Servicios" value={money(summary.servicesTotal)} />
        <Metric label="Productos" value={money(summary.productsTotal)} />
        <Metric label="Snacks / cafeteria" value={money(summary.snacksTotal)} />
        <Metric label="Atenciones realizadas" value={summary.attentionCount ?? 0} />
        <Metric label="Clientes atendidos" value={summary.customersServed ?? 0} />
        <Metric label="Ticket promedio" value={money(summary.averageTicket)} />
        <Metric label="Produccion estimada barberos" value={money(summary.estimatedBarberProduction)} />
        <Metric label="Pago estimado barberos" value={money(summary.estimatedBarberPay)} />
        <Metric label="Costo estimado productos" value={money(summary.estimatedProductCost)} />
        <Metric label="Anulados" value={money(summary.voidedTotal)} />
      </div>
      <Panel title="Remanente operativo estimado antes de gastos">
        <p className="text-3xl font-semibold text-[var(--control-primary)]">{money(summary.operationalRemainderBeforeExpenses)}</p>
        <p className="mt-2 text-sm text-[var(--control-muted)]">Este calculo no incluye gastos fijos, egresos administrativos, impuestos ni pagos externos.</p>
        {summary.missingProductCosts ? <p className="mt-2 text-sm text-amber-200">Hay productos sin costo registrado; el margen puede estar incompleto.</p> : null}
      </Panel>
      <Panel title="Hallazgos del periodo"><ul className="grid gap-2 text-sm text-[var(--control-muted)]">{(data.insights ?? []).map((item: string) => <li key={item}>- {item}</li>)}</ul></Panel>
    </div>
  );
}

function Sales({ data }: { data: any }) {
  return (
    <div className="grid gap-4">
      <TablePanel title="Ventas por dia" rows={data.salesByDay ?? []} columns={["date", "totalSold", "totalCollected", "services", "products", "snacks", "voided", "averageTicket", "attentionCount"]} />
      <TablePanel title="Metodos de pago" rows={data.paymentMethods ?? []} columns={["method", "total"]} />
      <TablePanel title="Movimientos detalle" rows={data.movements ?? []} columns={["time", "customer", "type", "category", "amount", "paymentMethod", "status", "barber", "branch"]} />
    </div>
  );
}

function Clients({ data }: { data: any }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Clientes atendidos" value={data?.customersServed ?? 0} />
        <Metric label="Clientes nuevos" value={data?.newCustomers ?? 0} />
        <Metric label="Clientes recurrentes" value={data?.recurrentCustomers ?? 0} />
        <Metric label="Con WhatsApp" value={data?.customersWithWhatsapp ?? 0} />
      </div>
      <TablePanel title="Clientes" rows={data?.rows ?? []} columns={["customer", "phone", "visits", "totalConsumption", "lastVisit", "frequentBranch", "origin"]} />
    </div>
  );
}

function PeakHours({ data }: { data: any }) {
  return <div className="grid gap-4 lg:grid-cols-2"><TablePanel title="Dias con mas atenciones" rows={data?.byDay ?? []} columns={["label", "attentions", "sales"]} /><TablePanel title="Horas con mas atenciones" rows={data?.byHour ?? []} columns={["label", "attentions", "sales"]} /></div>;
}

function TablePanel({ title, rows, columns }: { title: string; rows: any[]; columns: string[] }) {
  return (
    <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--control-primary)]"><tr>{columns.map((column) => <th key={column} className="p-3">{label(column)}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 80).map((row, index) => <tr key={row.id ?? `${title}-${index}`} className="border-t border-[var(--control-border)]">{columns.map((column) => <td key={column} className="p-3 text-[var(--control-muted)]">{formatValue(row[column], column)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="text-sm text-[var(--control-muted)]">Sin datos para el periodo.</p> : null}
      {rows.length > 80 ? <p className="text-xs text-[var(--control-muted)]">Mostrando 80 filas. Usa Excel para ver el detalle completo.</p> : null}
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs text-[var(--control-muted)]">{label}{children}</label>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-2 truncate text-xl font-semibold text-[var(--control-text)]">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3 min-w-0">{children}</div></section>;
}

function Skeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)]" />)}</div>;
}

function Empty() {
  return <Panel title="Sin datos"><p className="text-sm text-[var(--control-muted)]">Aplica filtros o recarga el modulo para consultar el periodo.</p></Panel>;
}

function money(value: unknown) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}

function formatValue(value: unknown, column?: string) {
  if (typeof value === "number" && column && moneyColumns.has(column)) return money(value);
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "string" && isIsoDateTime(value)) return formatPeruDateTime(value);
  return value == null || value === "" ? "-" : String(value);
}

const moneyColumns = new Set(["totalSold", "totalCollected", "services", "products", "snacks", "voided", "averageTicket", "revenue", "grossProduction", "validProduction", "estimatedPay", "productsAssociated", "estimatedCost", "estimatedMargin", "totalConsumption", "sales", "amount", "total"]);

function isIsoDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function label(value: string) {
  return value.replace(/([A-Z])/g, " $1").replaceAll("_", " ");
}
