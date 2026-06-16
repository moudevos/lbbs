"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-state";

type AuditLog = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  actor_branch_id: string | null;
  event_type: string;
  table_name: string;
  record_id: string | null;
  new_data: Record<string, unknown> | null;
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [tableName, setTableName] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    const branchScope = localStorage.getItem("lbbs:branchScope") ?? "all";
    params.set("branch_id", branchScope);
    if (date) params.set("date", date);
    if (eventType) params.set("event_type", eventType);
    if (tableName) params.set("table_name", tableName);
    const response = await fetch(`/api/control/audit-logs?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      await Swal.fire("No se pudo cargar auditoria", data.error ?? "Error desconocido", "error");
      return;
    }
    setLogs(data.logs ?? []);
  }

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[var(--gold-soft)]" size={24} />
            <h1 className="text-3xl font-semibold">Auditoria</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Eventos operativos recientes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Accion" value={eventType} onChange={(e) => setEventType(e.target.value)} />
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Tabla" value={tableName} onChange={(e) => setTableName(e.target.value)} />
          <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={load}>Filtrar</button>
        </div>
      </div>
      {loading ? <TableSkeleton /> : null}
      {!loading && logs.length === 0 ? <EmptyState message="No hay eventos para los filtros seleccionados." /> : null}
      <div className="grid gap-2">
        {logs.map((log) => (
          <article key={log.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--gold-soft)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-[var(--gold-soft)]">{new Date(log.created_at).toLocaleString("es-PE")}</p>
                <h2 className="mt-1 font-semibold">{log.event_type} - {log.table_name}</h2>
                <p className="text-sm text-[var(--text-muted)]">Actor: {log.actor_role ?? "sistema"} - Registro: {log.record_id ?? "N/A"}</p>
              </div>
              <pre className="max-w-xl overflow-auto rounded-lg bg-black/60 p-3 text-xs text-[var(--text-muted)]">{JSON.stringify(log.new_data ?? {}, null, 2)}</pre>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
