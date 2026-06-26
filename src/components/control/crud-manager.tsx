"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Eye, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonSpinner, FormLoadingOverlay, TableSkeleton } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { ScheduleEditor } from "@/components/ui/schedule-editor";
import { CsvToolsPanel } from "@/components/import-export/csv-tools-panel";
import { AvatarCropUploader } from "@/components/employees/avatar-crop-uploader";
import { EmployeeProfileModal } from "@/components/employees/employee-profile-modal";
import { BranchImageUploader } from "@/components/branches/branch-image-uploader";

type Module = "branches" | "services" | "customers" | "employees";
type Row = Record<string, any>;

const labels: Record<Module, string> = {
  branches: "Sedes",
  services: "Servicios",
  customers: "Clientes",
  employees: "Empleados"
};

export function CrudManager({ module }: { module: Module }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [query, setQuery] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    const queryString = `?${params}`;
    const [dataResponse, branchResponse, meResponse] = await Promise.all([fetch(`/api/control/${module}${queryString}`), fetch("/api/control/branches"), fetch("/api/control/me")]);
    const data = await dataResponse.json();
    const branchData = await branchResponse.json();
    const meData = await meResponse.json();
    setLoading(false);
    if (!dataResponse.ok) {
      await Swal.fire("No se pudo cargar", data.error ?? "Error desconocido", "error");
      return;
    }
    setRows(data[module] ?? []);
    setBranches(branchData.branches ?? []);
    setRole(meData.employee?.role ?? null);
  }

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  function blank(): Row {
    if (module === "branches") return { name: "", address: "", phone: "", imageUrl: null, imageAlt: "", schedules: defaultBranchSchedule() };
    if (module === "services") return { name: "", description: "", durationMinutes: 30, price: 0, branchId: "" };
    if (module === "customers") return { fullName: "", phone: "", notes: "", branchId: "" };
    return { firstName: "", lastName: "", nickname: "", specialty: "", productionPercentage: 50, canPerformServices: true, phone: "", email: "", role: "barbero", branchId: "", createUser: false };
  }

  function fromRow(row: Row): Row {
    if (module === "branches") return { id: row.id, name: row.name, address: row.address ?? "", phone: row.phone ?? "", imageUrl: row.image_url ?? "", imageAlt: row.image_alt ?? "", isActive: row.is_active, schedules: defaultBranchSchedule() };
    if (module === "services") return { id: row.id, name: row.name, description: row.description ?? "", durationMinutes: row.duration_minutes, price: row.price ?? "", branchId: row.branch_id ?? "", isActive: row.is_active };
    if (module === "customers") return { id: row.id, fullName: row.full_name, phone: row.phone, notes: row.notes ?? "", branchId: row.branch_id ?? "", isActive: row.is_active };
    return { id: row.id, firstName: row.first_name, lastName: row.last_name, nickname: row.nickname ?? "", specialty: row.specialty ?? "", productionPercentage: row.production_percentage ?? 50, canPerformServices: Boolean(row.can_perform_services || row.role === "barbero"), profilePhotoUrl: row.profile_photo_url ?? "", phone: row.phone ?? "", email: row.email ?? "", role: row.role, branchId: row.branch_id ?? "", isActive: row.is_active };
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const response = await fetch(!editing.id ? `/api/control/${module}` : `/api/control/${module}/${editing.id}`, {
      method: !editing.id ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      await Swal.fire("No se pudo guardar", data.error ?? "Error desconocido", "error");
      return;
    }
    if (data.temporaryPassword) setTemporaryPassword(data.temporaryPassword);
    const savedId = editing.id ?? data.branch?.id;
    if (module === "branches" && savedId && Array.isArray(editing.schedules)) {
      const scheduleResponse = await fetch(`/api/control/branches/${savedId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: editing.schedules })
      });
      const scheduleData = await scheduleResponse.json();
      if (!scheduleResponse.ok) {
        await Swal.fire("Horario no guardado", scheduleData.error ?? "El registro se guardo, pero fallo el horario.", "error");
      }
    }
    setEditing(null);
    await load();
    await Swal.fire("Guardado", "Registro actualizado.", "success");
  }

  async function deactivate(id: string, active = false) {
    const confirm = await Swal.fire({ title: active ? "Reactivar registro" : "Desactivar registro", icon: active ? "question" : "warning", showCancelButton: true });
    if (!confirm.isConfirmed) return;
    const response = await fetch(`/api/control/${module}/${id}/deactivate`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    const data = await response.json();
    if (!response.ok) {
      await Swal.fire("No se pudo desactivar", data.error ?? "Error desconocido", "error");
      return;
    }
    await load();
  }

  const canMutate =
    role === "admin" ||
    (module === "customers" && role === "recepcion");

  async function resetPassword(id: string) {
    const response = await fetch(`/api/control/employees/${id}/reset-password`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      await Swal.fire("No se pudo resetear", data.error ?? "Error desconocido", "error");
      return;
    }
    setTemporaryPassword(data.temporaryPassword);
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="sr-only">{labels[module]}</h1>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 disabled:opacity-60" disabled={loading} onClick={load}>{loading ? <><ButtonSpinner /> Buscando</> : "Buscar"}</button>
          <div className="inline-flex rounded-lg border border-[var(--border-soft)] p-1">
            <button className={`rounded-md px-3 py-1 text-sm ${view === "cards" ? "bg-[var(--gold)] text-black" : "text-[var(--text-muted)]"}`} onClick={() => setView("cards")}>Cards</button>
            <button className={`rounded-md px-3 py-1 text-sm ${view === "table" ? "bg-[var(--gold)] text-black" : "text-[var(--text-muted)]"}`} onClick={() => setView("table")}>Tabla</button>
          </div>
          {canMutate ? <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 font-semibold text-black" onClick={() => setEditing(blank())}><Plus size={16} /> Nuevo</button> : null}
        </div>
      </div>
      {temporaryPassword ? <div className="rounded-lg border border-[var(--border-soft)] bg-[rgba(212,175,55,0.08)] p-4 text-sm">Password temporal visible una sola vez: <strong>{temporaryPassword}</strong><br />El empleado debe validar su correo y luego cambiar este password al ingresar.</div> : null}
      {module === "customers" ? <CsvToolsPanel title="Importar clientes Google Contacts CSV" importUrl="/api/control/customers/import-preview" exportUrl="/api/control/reports/customers/export" exportFormat="xlsx" onImported={load} /> : null}
      {editing ? <EditorModal module={module} row={editing} branches={branches} saving={saving} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} /> : null}
      {loading && rows.length === 0 ? <TableSkeleton /> : null}
      {!loading && rows.length === 0 ? <EmptyState /> : null}
      <div className={`${view === "cards" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid gap-2"} transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`}>
        {rows.map((row) => (
          <article key={row.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-3">
            <div className={view === "cards" ? "flex h-full flex-col justify-between gap-3" : "flex flex-col gap-3 md:flex-row md:items-center md:justify-between"}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.code || row.sku ? <span className="text-sm text-[var(--gold-soft)]">{row.code ?? row.sku}</span> : null}
                  {row.role ? <RoleBadge role={row.role} /> : null}
                  <StatusBadge active={row.is_active} />
                </div>
                {module === "employees" && row.profile_photo_url ? <img src={row.profile_photo_url} alt="" className="mb-2 h-14 w-14 rounded-full object-cover" /> : null}
                <h2 className="mt-2 text-base font-semibold">{module === "employees" ? (`${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || row.full_name || row.name) : (row.name ?? row.full_name)}</h2>
                {module === "employees" && row.nickname ? <p className="text-sm text-[var(--gold-soft)]">Apodo: {row.nickname}</p> : null}
                <p className="text-sm text-[var(--text-muted)]">{describeRow(module, row)}</p>
                {module === "customers" ? <CustomerStats row={row} /> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {module === "employees" ? <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs" onClick={() => setProfileEmployeeId(row.id)}><Eye size={14} /> Ver perfil</button> : null}
                {canMutate ? <button className="rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs" onClick={async () => {
                  const next = fromRow(row);
                  if (module === "branches") {
                    const response = await fetch(`/api/control/branches/${row.id}/schedule`);
                    const data = await response.json();
                    next.schedules = response.ok && data.schedules?.length ? data.schedules : defaultBranchSchedule();
                  }
                  setEditing(next);
                }}>Editar</button> : null}
                {canMutate && module === "employees" && row.role !== "barbero" && row.user_id ? <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs" onClick={() => resetPassword(row.id)}><RotateCcw size={14} /> Reset</button> : null}
                {canMutate ? row.is_active
                  ? <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs text-red-200" onClick={() => deactivate(row.id)}><Trash2 size={14} /> Desactivar</button>
                  : module === "services"
                    ? <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-2 py-1.5 text-xs text-green-300" onClick={() => deactivate(row.id, true)}><RotateCcw size={14} /> Reactivar</button>
                    : null
                  : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      <EmployeeProfileModal employeeId={profileEmployeeId} onClose={() => setProfileEmployeeId(null)} />
    </section>
  );
}

function EditorModal({ module, row, branches, saving, onChange, onSave, onCancel }: { module: Module; row: Row; branches: Row[]; saving: boolean; onChange: (row: Row) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[1250] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar formulario" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={saving ? undefined : onCancel} />
      <div role="dialog" aria-modal="true" aria-label={`${row.id ? "Editar" : "Crear"} ${labels[module]}`} className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[var(--border-soft)] bg-[#0b0b0b] p-5 shadow-2xl md:p-7">
        <FormLoadingOverlay show={saving} />
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">{row.id ? "Editar registro" : "Nuevo registro"}</p><h2 className="mt-1 text-2xl font-semibold">{labels[module]}</h2></div>
          <button type="button" aria-label="Cerrar" className="rounded-full border border-[var(--border-soft)] p-2 disabled:opacity-50" disabled={saving} onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
        {module === "branches" ? <><Input label="Nombre" value={row.name} onChange={(v) => onChange({ ...row, name: v })} /><Input label="Celular" value={row.phone} onChange={(v) => onChange({ ...row, phone: v })} /><Input label="Direccion" value={row.address} onChange={(v) => onChange({ ...row, address: v })} />{row.id ? <BranchImageUploader branch={{ id: String(row.id), imageUrl: row.imageUrl, imageAlt: row.imageAlt }} onChange={(patch) => onChange({ ...row, ...patch })} /> : <p className="md:col-span-2 text-sm text-[var(--text-muted)]">Guarda primero la sede para poder subir su imagen.</p>}<div className="md:col-span-2"><p className="mb-2 text-sm text-[var(--text-muted)]">Horario semanal de sede</p><ScheduleEditor mode="branch" value={row.schedules ?? defaultBranchSchedule()} onChange={(value) => onChange({ ...row, schedules: value })} /></div></> : null}
        {module === "services" ? <><Input label="Nombre" value={row.name} onChange={(v) => onChange({ ...row, name: v })} /><Input label="Descripcion" value={row.description} onChange={(v) => onChange({ ...row, description: v })} /><Input label="Duracion min" type="number" value={row.durationMinutes} onChange={(v) => onChange({ ...row, durationMinutes: Number(v) })} /><Input label="Precio" type="number" step="0.01" value={row.price} onChange={(v) => onChange({ ...row, price: v })} /><BranchSelect value={row.branchId} branches={branches} allowGlobal onChange={(v) => onChange({ ...row, branchId: v })} /></> : null}
        {module === "customers" ? <><Input label="Nombre" value={row.fullName} onChange={(v) => onChange({ ...row, fullName: v })} /><Input label="Celular" value={row.phone} onChange={(v) => onChange({ ...row, phone: v })} /><Input label="Notas" value={row.notes} onChange={(v) => onChange({ ...row, notes: v })} /><BranchSelect value={row.branchId} branches={branches} onChange={(v) => onChange({ ...row, branchId: v })} /></> : null}
        {module === "employees" ? <><Input label="Nombre" value={row.firstName} onChange={(v) => onChange({ ...row, firstName: v })} /><Input label="Apellido" value={row.lastName} onChange={(v) => onChange({ ...row, lastName: v })} /><Input label="Apodo visible" value={row.nickname} onChange={(v) => onChange({ ...row, nickname: v })} /><Input label="Especialidad" value={row.specialty} onChange={(v) => onChange({ ...row, specialty: v })} /><Input label="% produccion" type="number" value={row.productionPercentage} onChange={(v) => onChange({ ...row, productionPercentage: Number(v) })} /><label className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><input type="checkbox" checked={Boolean(row.canPerformServices || row.role === "barbero")} disabled={row.role === "barbero"} onChange={(e) => onChange({ ...row, canPerformServices: e.target.checked })} /> Puede realizar servicios</label><Input label="Celular" value={row.phone} onChange={(v) => onChange({ ...row, phone: v })} /><Input label="Email" value={row.email} onChange={(v) => onChange({ ...row, email: v })} /><label className="text-sm text-[var(--text-muted)]">Rol<select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={row.role} onChange={(e) => { const nextRole = e.target.value; onChange({ ...row, role: nextRole, canPerformServices: nextRole === "barbero" ? true : row.canPerformServices, createUser: nextRole === "barbero" ? false : row.createUser }); }}><option value="admin">admin</option><option value="recepcion">recepcion</option><option value="barbero">barbero</option></select></label><BranchSelect value={row.branchId} branches={branches} onChange={(v) => onChange({ ...row, branchId: v })} />{row.id ? <AvatarCropUploader row={row} onUploaded={(url) => onChange({ ...row, profilePhotoUrl: url })} /> : null}{!row.id ? <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><input type="checkbox" checked={Boolean(row.createUser)} disabled={row.role === "barbero"} onChange={(e) => onChange({ ...row, createUser: e.target.checked })} /> Crear usuario Auth{row.role === "barbero" ? " (no aplica para barberos)" : ""}</label> : null}</> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border-soft)] pt-4">
          <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black disabled:opacity-60" onClick={onSave} disabled={saving}>{saving ? <ButtonSpinner /> : <Save size={16} />} Guardar</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", step }: { label: string; value: any; onChange: (value: string) => void; type?: string; step?: string }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function BranchSelect({ value, branches, onChange, allowGlobal }: { value: string; branches: Row[]; onChange: (value: string) => void; allowGlobal?: boolean }) {
  return <label className="text-sm text-[var(--text-muted)]">Sede<select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">{allowGlobal ? "Global" : "Seleccionar"}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>;
}

function describeRow(module: Module, row: Row) {
  if (module === "services") {
    const price = row.price == null ? "Sin precio" : `S/ ${Number(row.price).toFixed(2)}`;
    const branch = Array.isArray(row.branches) ? row.branches[0]?.name : row.branches?.name;
    return `${row.duration_minutes} min - ${price} - ${branch ?? "Global"}`;
  }
  if (module === "employees") return `${row.first_name ?? ""} ${row.last_name ?? ""} - ${row.specialty ?? "Sin especialidad"} - ${row.email ?? "Sin email"} - ${row.onboarding_status ?? (row.must_change_password ? "pending_password_change" : "active")}`;
  if (module === "customers") return `${row.phone ?? "Sin celular"} - ${row.notes ?? "Sin notas"}`;
  return `${row.address ?? "Sin direccion"} - ${row.phone ?? "Sin celular"}`;
}

function defaultBranchSchedule() {
  return Array.from({ length: 7 }).map((_, dayOfWeek) => ({
    dayOfWeek,
    opensAt: "10:00",
    closesAt: "20:00",
    isActive: dayOfWeek !== 0
  }));
}

function CustomerStats({ row }: { row: Row }) {
  const stats = Array.isArray(row.customer_visit_stats) ? row.customer_visit_stats[0] : row.customer_visit_stats;
  const rewards = Array.isArray(row.customer_reward_accounts) ? row.customer_reward_accounts[0] : row.customer_reward_accounts;
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
      <span className="rounded-md border border-[var(--border-soft)] px-2 py-1">Atenciones: {stats?.total_visits ?? 0}</span>
      <span className="rounded-md border border-[var(--border-soft)] px-2 py-1">Rewards: {rewards?.available_rewards ?? 0}</span>
      <span className="rounded-md border border-[var(--border-soft)] px-2 py-1">Ultima atencion: {stats?.last_visit_at ? new Date(stats.last_visit_at).toLocaleDateString("es-PE") : "Sin registro"}</span>
    </div>
  );
}
