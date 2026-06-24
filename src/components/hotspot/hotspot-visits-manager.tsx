"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Wifi } from "lucide-react";
import { ButtonSpinner, TableSkeleton } from "@/components/ui/loading-state";
import { ControlButton, ControlCard, ControlInput } from "@/components/ui/control-primitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { showError, showSuccess } from "@/lib/ui/swal";

type Branch = { id: string; code: string; name: string };
type MetricState = {
  today: number;
  month: number;
  newCustomers: number;
  returningCustomers: number;
  marketingConsents: number;
  topBranch: { name: string; total: number } | null;
};
type HotspotVisit = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  accepted_terms: boolean;
  accepted_marketing: boolean;
  mac_address: string | null;
  ip_address: string | null;
  visited_at: string;
  isNewCustomer: boolean;
  branches?: { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null;
};

export function HotspotVisitsManager() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState("all");
  const [query, setQuery] = useState("");
  const [marketing, setMarketing] = useState("all");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [visits, setVisits] = useState<HotspotVisit[]>([]);
  const [metrics, setMetrics] = useState<MetricState | null>(null);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    const search = new URLSearchParams({ from, to, branch_id: branchId });
    if (query.trim()) search.set("q", query.trim());
    if (marketing !== "all") search.set("marketing", marketing);
    return search;
  }, [branchId, from, marketing, query, to]);

  async function load() {
    setLoading(true);
    const [visitsResponse, branchesResponse] = await Promise.all([
      fetch(`/api/control/hotspot-visits?${params}`),
      fetch("/api/control/branches")
    ]);
    const [visitsData, branchesData] = await Promise.all([visitsResponse.json(), branchesResponse.json()]);
    setLoading(false);
    if (!visitsResponse.ok) return showError("No se pudieron cargar visitas hotspot", visitsData.error ?? "Error desconocido");
    if (branchesResponse.ok) setBranches(branchesData.branches ?? []);
    setVisits(visitsData.visits ?? []);
    setMetrics(visitsData.metrics ?? null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  async function copyPhone(phone: string) {
    await navigator.clipboard.writeText(phone);
    await showSuccess("WhatsApp copiado");
  }

  const exportUrl = `/api/control/reports/hotspot-visits/export?${params}`;

  return (
    <section className="grid min-w-0 gap-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(0,900px)] xl:items-end">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-soft)]"><Wifi size={16} /> WiFi comercial</p>
          <h1 className="mt-2 text-3xl font-semibold">Hotspot visitas</h1>
          <p className="mt-1 text-sm text-[var(--control-muted)]">Clientes captados desde el portal externo MikroTik por sede.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[140px_140px_180px_minmax(170px,1fr)_160px_auto]">
          <ControlInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <ControlInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <select className="control-input" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="all">Todas las sedes</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <ControlInput placeholder="Nombre o celular" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} />
          <select className="control-input" value={marketing} onChange={(event) => setMarketing(event.target.value)}>
            <option value="all">Marketing: todos</option>
            <option value="yes">Acepto publicidad</option>
            <option value="no">No acepto</option>
          </select>
          <ControlButton variant="primary" onClick={load} disabled={loading}>{loading ? <ButtonSpinner /> : null} Buscar</ControlButton>
        </div>
      </div>

      {metrics ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Visitas hoy" value={metrics.today} />
          <Metric label="Visitas del mes" value={metrics.month} />
          <Metric label="Clientes nuevos" value={metrics.newCustomers} />
          <Metric label="Recurrentes" value={metrics.returningCustomers} />
          <Metric label="Consentimientos" value={metrics.marketingConsents} />
          <Metric label="Sede top" value={metrics.topBranch ? `${metrics.topBranch.name} (${metrics.topBranch.total})` : "Sin datos"} />
        </div>
      ) : null}

      <ControlCard className="p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Visitas registradas</h2>
            <p className="text-xs text-[var(--control-muted)]">Exporta contactos autorizados para campañas o seguimiento comercial.</p>
          </div>
          <a className="inline-flex items-center justify-center rounded-xl border border-[var(--control-border-strong)] bg-[var(--control-surface-2)] px-4 py-2.5 font-medium" href={exportUrl}>Exportar XLSX</a>
        </div>
        {loading ? <TableSkeleton rows={4} /> : null}
        {!loading ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--control-muted)]">
                <tr>
                  <th className="p-2">Fecha/hora</th>
                  <th className="p-2">Sede</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Celular</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Terminos</th>
                  <th className="p-2">Publicidad</th>
                  <th className="p-2">IP / MAC</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => {
                  const branch = Array.isArray(visit.branches) ? visit.branches[0] : visit.branches;
                  return (
                    <tr key={visit.id} className="border-t border-[var(--control-border)] align-top">
                      <td className="p-2">{new Date(visit.visited_at).toLocaleString("es-PE")}</td>
                      <td className="p-2">{branch?.name ?? "Sede"}</td>
                      <td className="p-2"><strong>{visit.customer_name}</strong></td>
                      <td className="p-2">{visit.phone}</td>
                      <td className="p-2"><StatusBadge label={visit.isNewCustomer ? "Nuevo" : "Recurrente"} /></td>
                      <td className="p-2">{visit.accepted_terms ? "Si" : "No"}</td>
                      <td className="p-2">{visit.accepted_marketing ? "Si" : "No"}</td>
                      <td className="p-2"><p>{visit.ip_address ?? "Sin IP"}</p><p className="text-xs text-[var(--control-muted)]">{visit.mac_address ?? "Sin MAC"}</p></td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          {visit.customer_id ? <Link className="rounded-lg border border-[var(--control-border)] px-2 py-1" href={`/app/control/clientes?customer=${visit.customer_id}`}>Ver cliente</Link> : null}
                          <button className="rounded-lg border border-[var(--control-border)] px-2 py-1" onClick={() => void copyPhone(visit.phone)}><Copy size={14} className="inline" /> Copiar</button>
                          <a className="rounded-lg border border-[var(--control-border)] px-2 py-1" href={`https://wa.me/51${visit.phone}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="inline" /> WhatsApp</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {!loading && visits.length === 0 ? <p className="py-8 text-center text-sm text-[var(--control-muted)]">Sin visitas para los filtros seleccionados.</p> : null}
      </ControlCard>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <ControlCard className="p-4">
      <p className="text-xs text-[var(--control-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--gold-soft)]">{value}</p>
    </ControlCard>
  );
}
