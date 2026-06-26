"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, RotateCcw, X } from "lucide-react";
import { benefitLabels } from "@/lib/employee-benefits/types";
import { showError, showSuccess, swalThemed } from "@/lib/ui/swal";

const currentMonth = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${currentMonth}-01`;
const blank = {
  kind: "free-haircut", employeeId: "", branchId: "", productId: "",
  quantity: "1", amount: "", credit: false, paymentMethod: "efectivo", reason: "", notes: ""
};

export function EmployeeBenefitsManager() {
  const [month, setMonth] = useState(currentMonth);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [movements, setMovements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [options, setOptions] = useState<{ branches: any[]; employees: any[]; products: any[] }>({ branches: [], employees: [], products: [] });
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    const [movementsResponse, summaryResponse, optionsResponse, employeesResponse, productsResponse] = await Promise.all([
      fetch(`/api/control/employee-benefits?${params}`),
      fetch(`/api/control/employee-benefits/summary?${params}`),
      fetch("/api/public/reservation-options"),
      fetch("/api/control/employees"),
      fetch("/api/control/products")
    ]);
    const [movementsData, summaryData, optionsData, employeesData, productsData] = await Promise.all([
      movementsResponse.json(), summaryResponse.json(), optionsResponse.json(), employeesResponse.json(), productsResponse.json()
    ]);
    if (!movementsResponse.ok) await showError("No se pudo cargar", movementsData.error ?? "Revisa los permisos.");
    setMovements(movementsData.movements ?? []);
    setSummary(summaryData ?? {});
    setOptions({
      branches: optionsData.branches ?? [],
      employees: employeesData.employees ?? [],
      products: productsData.products ?? []
    });
    setLoading(false);
  }

  // Reloading is intentionally keyed by the selected accounting period.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [from, to]);

  async function save() {
    if (!form.employeeId || !form.branchId) return showError("Datos incompletos", "Selecciona empleado y sede.");
    const endpoint = `/api/control/employee-benefits/${form.kind}`;
    const body = {
      employeeId: form.employeeId, branchId: form.branchId, productId: form.productId,
      quantity: Number(form.quantity), amount: Number(form.amount), credit: form.credit,
      paymentMethod: form.paymentMethod, reason: form.reason, notes: form.notes
    };
    const confirmation = await swalThemed.fire({
      title: "Registrar movimiento",
      text: form.productId ? "Este movimiento puede descontar stock." : "Confirma los datos antes de continuar.",
      icon: "question", showCancelButton: true, confirmButtonText: "Registrar", cancelButtonText: "Cancelar"
    });
    if (!confirmation.isConfirmed) return;
    setSaving(true);
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return showError("No se pudo registrar", data.error ?? "Revisa los datos.");
    setOpen(false); setForm(blank); await load(); await showSuccess("Movimiento registrado");
  }

  async function reverse(id: string) {
    const result = await swalThemed.fire({ title: "Reversar movimiento", input: "text", inputLabel: "Motivo obligatorio", showCancelButton: true, confirmButtonText: "Reversar" });
    if (!result.isConfirmed || !String(result.value ?? "").trim()) return;
    const response = await fetch(`/api/control/employee-benefits/${id}/reverse`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: result.value })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo reversar", data.error ?? "Intenta nuevamente.");
    await load(); await showSuccess("Movimiento reversado");
  }

  const metrics = [
    ["Cafeteria credito", summary.cafeteriaCredit, true],
    ["Productos credito", summary.productCredit, true],
    ["Adelantos", summary.advances, true],
    ["Descuentos", summary.deductions, true],
    ["Cortes 50% usados", summary.freeHaircuts, false],
    ["Pagado al momento", summary.cashPaid, true],
    ["Pendiente descontar", summary.pendingDeduction, true]
  ] as const;

  return <section className="grid gap-5">
    <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <h1 className="sr-only">Beneficios de empleados</h1>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[160px_160px_auto_auto_auto]">
        <label className="grid gap-1 text-xs text-[var(--control-muted)]">Inicio<input className="control-input w-full" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="grid gap-1 text-xs text-[var(--control-muted)]">Fin<input className="control-input w-full" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <input className="control-input w-full" type="month" value={month} onChange={(event) => { const next = event.target.value; setMonth(next); setFrom(`${next}-01`); setTo(today); }} title="Atajo por mes" />
        <a className="rounded-lg border border-[var(--control-border)] px-4 py-2 text-sm" href="/api/control/reports/employee-benefits/export">Exportar XLSX</a>
        <button className="control-primary-button inline-flex items-center gap-2 rounded-lg px-4 py-2" onClick={() => setOpen(true)}><Plus size={16} /> Registrar</button>
      </div>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(([label, value, money]) => <article key={label} className="control-surface rounded-xl border border-[var(--control-border)] p-4"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{money ? `S/ ${Number(value ?? 0).toFixed(2)}` : Number(value ?? 0)}</p></article>)}
    </div>
    <section className="control-surface overflow-hidden rounded-xl border border-[var(--control-border)]">
      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[var(--control-muted)]"><Loader2 className="animate-spin" size={18} /> Cargando movimientos...</div> :
      movements.length === 0 ? <div className="p-8 text-center text-sm text-[var(--control-muted)]">No hay movimientos para este mes.</div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="control-surface-muted text-xs uppercase text-[var(--control-muted)]"><tr>{["Fecha","Empleado","Sede","Tipo","Producto","Cantidad","Total","Pago","Estado","Registrado por","Acciones"].map((item) => <th className="p-3" key={item}>{item}</th>)}</tr></thead><tbody>{movements.map((row) => <MovementRow key={row.id} row={row} onReverse={reverse} />)}</tbody></table></div>}
    </section>
    {open ? <BenefitModal form={form} setForm={setForm} options={options} saving={saving} onClose={() => setOpen(false)} onSave={save} /> : null}
  </section>;
}

function MovementRow({ row, onReverse }: { row: any; onReverse: (id: string) => void }) {
  const employee = row.employees; const creator = row.creator;
  return <tr className="border-t border-[var(--control-border)]">
    <td className="p-3">{new Date(row.created_at).toLocaleDateString("es-PE")}</td>
    <td className="p-3 font-medium">{employee ? `${employee.first_name} ${employee.last_name}` : "-"}</td>
    <td className="p-3">{row.branches?.name ?? "-"}</td><td className="p-3">{benefitLabels[row.movement_type] ?? row.movement_type}</td>
    <td className="p-3">{row.products?.name ?? "-"}</td><td className="p-3">{row.quantity}</td><td className="p-3">S/ {Number(row.total_amount).toFixed(2)}</td>
    <td className="p-3">{row.payment_mode ?? "No aplica"}</td><td className="p-3">{row.status}</td>
    <td className="p-3">{creator ? `${creator.first_name} ${creator.last_name}` : "-"}</td>
    <td className="p-3">{row.status === "active" ? <button className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-2 py-1 text-xs text-red-300" onClick={() => onReverse(row.id)}><RotateCcw size={13} /> Reversar</button> : "-"}</td>
  </tr>;
}

function BenefitModal({ form, setForm, options, saving, onClose, onSave }: any) {
  const needsProduct = ["cafeteria", "barber-product"].includes(form.kind);
  const needsAmount = ["salary-advance", "manual-deduction", "manual-adjustment"].includes(form.kind);
  const needsReason = needsAmount || (form.kind === "barber-product" && Number(options.products.find((p: any) => p.id === form.productId)?.cost_price ?? 0) === 0);
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4"><div className="control-surface max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--control-border)] p-5">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Registrar beneficio</h2><p className="text-sm text-[var(--control-muted)]">Complete los datos del movimiento.</p></div><button onClick={onClose}><X /></button></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <Field label="Tipo"><select className="control-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="free-haircut">Corte empleado 50%</option><option value="cafeteria">Cafeteria</option><option value="barber-product">Producto barberia</option><option value="salary-advance">Adelanto</option><option value="manual-deduction">Descuento manual</option><option value="manual-adjustment">Ajuste manual</option></select></Field>
      <Field label="Empleado"><select className="control-input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Seleccionar</option>{options.employees.map((item: any) => <option value={item.id} key={item.id}>{item.first_name} {item.last_name}</option>)}</select></Field>
      <Field label="Sede"><select className="control-input" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">Seleccionar</option>{options.branches.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
      {needsProduct ? <><Field label="Producto"><select className="control-input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}><option value="">Seleccionar</option>{options.products.map((item: any) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Cantidad"><input className="control-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.checked })} /> Dejar a credito</label>{!form.credit ? <Field label="Metodo de pago"><select className="control-input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option>efectivo</option><option>yape</option><option>plin</option><option>tarjeta</option></select></Field> : null}</> : null}
      {(needsAmount || form.kind === "free-haircut") ? <Field label={form.kind === "free-haircut" ? "Precio normal del corte" : "Monto"}><input className="control-input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field> : null}
      <div className="md:col-span-2"><Field label={needsReason ? "Motivo obligatorio" : "Motivo / observacion"}><textarea className="control-input min-h-24" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field></div>
    </div>
    <div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border border-[var(--control-border)] px-4 py-2" onClick={onClose}>Cancelar</button><button disabled={saving} className="control-primary-button inline-flex items-center gap-2 rounded-lg px-4 py-2" onClick={onSave}>{saving ? <Loader2 className="animate-spin" size={16} /> : null} Guardar</button></div>
  </div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm text-[var(--control-muted)]">{label}{children}</label>;
}
