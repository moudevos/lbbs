"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { SearchCombobox, type SearchComboboxItem } from "@/components/ui/search-combobox";
import { formatPeruTime, toPeruDate } from "@/lib/datetime/peru-time";
import type { BranchOption } from "@/lib/reservations/types";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";

type CashTab = "Resumen" | "Movimientos" | "Salidas operativas" | "Cierre";

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
  const [countedCard, setCountedCard] = useState("");
  const [countedQr, setCountedQr] = useState("");
  const [countedTransfer, setCountedTransfer] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closureBusy, setClosureBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [operationalMovements, setOperationalMovements] = useState<any[]>([]);
  const [operationalSummary, setOperationalSummary] = useState<any>(null);
  const [replenishmentModal, setReplenishmentModal] = useState<{ suggestedAmount?: number } | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ date, branch_id: branchId, status });
    if (method) params.set("payment_method", method);
    if (search.trim()) params.set("search", search.trim());
    const [summaryRes, optionsRes, closureRes, operationalRes] = await Promise.all([
      fetch(`/api/control/cash/summary?${params}`, { cache: "no-store" }),
      fetch("/api/public/reservation-options"),
      fetch(`/api/control/cash/closure?date=${date}&branch_id=${branchId}`),
      fetch(`/api/control/cash/operational-movements?date=${date}&branch_id=${branchId}`, { cache: "no-store" })
    ]);
    const summary = await summaryRes.json();
    const operational = await operationalRes.json();
    setLoading(false);
    if (!summaryRes.ok) {
      await showError("No se pudo cargar caja", summary.error ?? "Sin permiso.");
      return;
    }
    setData(summary);
    if (operationalRes.ok) {
      setOperationalMovements(operational.movements ?? []);
      setOperationalSummary(operational.summary ?? null);
    }
    if (optionsRes.ok) {
      const opts = await optionsRes.json();
      setBranches(opts.branches ?? []);
    }
    if (closureRes.ok) {
      const nextClosure = (await closureRes.json()).closure;
      setClosure(nextClosure);
      const counted = nextClosure?.total_by_method?.counted;
      if (counted) {
        setCountedCash(String(counted.cash ?? nextClosure?.counted_cash ?? ""));
        setCountedCard(String(counted.card ?? ""));
        setCountedQr(String(counted.qr ?? ""));
        setCountedTransfer(String(counted.transfer ?? ""));
      }
    }
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
        body: JSON.stringify({
          branchId,
          date,
          countedCash: Number(countedCash || 0),
          countedByMethod: {
            cash: Number(countedCash || 0),
            card: Number(countedCard || 0),
            qr: Number(countedQr || 0),
            transfer: Number(countedTransfer || 0)
          },
          notes: closureNotes
        })
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

  async function voidOperationalMovement(id: string) {
    const reason = window.prompt("Motivo de anulacion");
    if (!reason?.trim()) return;
    if (!(await showConfirm("Anular salida operativa", "Se revertira tambien el stock asociado si hay saldo suficiente."))) return;
    const response = await fetch(`/api/control/cash/operational-movements/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const result = await response.json();
    if (!response.ok) return showError("No se pudo anular", result.error ?? "Intenta nuevamente.");
    await load();
    await showSuccess("Salida anulada");
  }

  const summary = data?.summary ?? {};
  const paymentMethods = summary.paymentMethods ?? {};
  const collectedMethods = closure?.total_by_method?.collected ?? bucketPaymentMethodRows(data?.byMethod);
  const operationalOuts = summary.operationalOuts ?? data?.operationalOuts ?? operationalSummary ?? { byMethod: { cash: 0, card: 0, qr: 0, transfer: 0 }, total: 0, count: 0 };
  const movements = data?.movements ?? [];
  const expectedCash = Number(paymentMethods.cash ?? 0);
  const expectedCard = Number(paymentMethods.card ?? 0);
  const expectedQr = Number(paymentMethods.qr ?? 0);
  const expectedTransfer = Number(paymentMethods.transfer ?? 0);
  const collectedCash = Number(collectedMethods.cash ?? 0);
  const collectedCard = Number(collectedMethods.card ?? 0);
  const collectedQr = Number(collectedMethods.qr ?? 0);
  const collectedTransfer = Number(collectedMethods.transfer ?? 0);
  const collectedTotal = collectedCash + collectedCard + collectedQr + collectedTransfer;
  const expectedTotal = expectedCash + expectedCard + expectedQr + expectedTransfer;
  const countedTotal = Number(countedCash || 0) + Number(countedCard || 0) + Number(countedQr || 0) + Number(countedTransfer || 0);
  const closureDifference = closure ? Number(closure.difference ?? 0) : countedTotal - expectedTotal;

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
        {(["Resumen", "Movimientos", "Salidas operativas", "Cierre"] as CashTab[]).map((item) => <button key={item} className={`rounded-full border px-4 py-2 text-sm ${tab === item ? "border-[var(--control-primary-border)] bg-[var(--control-primary-soft)] text-[var(--control-primary)]" : "border-[var(--control-border)] text-[var(--control-muted)]"}`} onClick={() => setTab(item)}>{item}</button>)}
      </div>

      {loading ? <Skeleton /> : null}
      {!loading && tab === "Resumen" ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Total vendido" value={money(summary.totalSold)} />
            <Metric label="Total de servicios" value={money(summary.servicesTotal)} />
            <Metric label="Total de productos" value={money(summary.productsTotal)} />
            <Metric label="Total de cafeteria" value={money(summary.snacksTotal)} />
            <Metric label="Gasto operativo" value={money(operationalOuts.total ?? 0)} />
            <Metric label="Total de deduccion" value={money(summary.serviceDeductionTotal)} />
            <Metric label="Total de servicios (unds)" value={String(summary.serviceUnits ?? data?.serviceCount ?? 0)} />
          </div>
        </div>
      ) : null}

      {!loading && tab === "Movimientos" ? (
        <Panel title="Movimientos">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--control-primary)]"><tr><th className="p-3">Hora</th><th className="p-3">Cliente</th><th className="p-3">Tipo</th><th className="p-3">Categoria</th><th className="p-3">Monto</th><th className="p-3">Deduccion</th><th className="p-3">Metodo</th><th className="p-3">Estado</th><th className="p-3">Barbero</th><th className="p-3">Acciones</th></tr></thead>
              <tbody>{movements.map((row: any) => <tr key={row.id} className="border-t border-[var(--control-border)]"><td className="p-3">{formatTime(row.time)}</td><td className="p-3">{row.customer}</td><td className="p-3">{movementTypeLabel(row.type)}</td><td className="p-3">{movementCategoryLabel(row.category)}</td><td className="p-3">{money(row.amount)}</td><td className="p-3">{money(row.deduction)}</td><td className="p-3">{paymentLabel(row.paymentMethod)}</td><td className="p-3">{statusLabel(row.status)}</td><td className="p-3">{row.barber}</td><td className="p-3"><Link className="rounded-lg border border-[var(--control-border)] px-3 py-2 text-xs" href={`/app/control/atenciones/${row.id}`}>Ver</Link></td></tr>)}</tbody>
            </table>
          </div>
          {movements.length === 0 ? <p className="text-sm text-[var(--control-muted)]">Sin movimientos para el filtro.</p> : null}
        </Panel>
      ) : null}

      {!loading && tab === "Salidas operativas" ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Salidas activas" value={money(operationalSummary?.total ?? 0)} />
              <Metric label="Efectivo" value={money(operationalSummary?.byMethod?.cash ?? 0)} />
              <Metric label="Tarjeta" value={money(operationalSummary?.byMethod?.card ?? 0)} />
              <Metric label="QR" value={money(operationalSummary?.byMethod?.qr ?? 0)} />
              <Metric label="Transferencia" value={money(operationalSummary?.byMethod?.transfer ?? 0)} />
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[var(--control-primary)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={branchId === "all"} onClick={() => setReplenishmentModal({})}>
              <Plus size={16} /> Reposicion de stock
            </button>
          </div>
          <Panel title="Salidas operativas">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--control-primary)]"><tr><th className="p-3">Hora</th><th className="p-3">Producto</th><th className="p-3">Sede</th><th className="p-3">Cantidad</th><th className="p-3">Monto</th><th className="p-3">Metodo</th><th className="p-3">Responsable</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
                <tbody>{operationalMovements.map((row: any) => <tr key={row.id} className="border-t border-[var(--control-border)]"><td className="p-3">{formatTime(row.occurred_at)}</td><td className="p-3">{row.productName}<p className="text-xs text-[var(--control-muted)]">{row.description}</p></td><td className="p-3">{row.branchName}</td><td className="p-3">{row.quantity}</td><td className="p-3">{money(row.amount)}<p className="text-xs text-[var(--control-muted)]">Unit. {money(row.unitCost)}</p></td><td className="p-3">{paymentLabel(row.payment_method)}</td><td className="p-3">{row.responsibleName || "-"}</td><td className="p-3">{row.status === "active" ? "Activo" : "Anulado"}</td><td className="p-3">{row.status === "active" ? <button className="inline-flex items-center gap-1 rounded-lg border border-red-300/40 px-3 py-2 text-xs text-red-200" onClick={() => voidOperationalMovement(row.id)}><Trash2 size={14} /> Anular</button> : <span className="text-xs text-[var(--control-muted)]">{row.void_reason ?? "Anulado"}</span>}</td></tr>)}</tbody>
              </table>
            </div>
            {operationalMovements.length === 0 ? <p className="text-sm text-[var(--control-muted)]">Sin salidas operativas para el filtro.</p> : null}
          </Panel>
        </div>
      ) : null}

      {!loading && tab === "Cierre" ? (
        branchId === "all" ? (
          <Panel title="Cierre de caja"><p className="text-sm text-[var(--control-muted)]">Selecciona una sede para consultar o cerrar su caja diaria.</p></Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Detalles del dia">
              <DetailRow label="Total cobrado" value={money(collectedTotal || summary.totalCollected)} strong />
              <DetailRow label="Total efectivo" value={money(collectedCash)} />
              <DetailRow label="Total tarjeta" value={money(collectedCard)} />
              <DetailRow label="Total QR (Yape/Plin)" value={money(collectedQr)} />
              <DetailRow label="Total transferencia" value={money(collectedTransfer)} />
              <div className="my-2 border-t border-[var(--control-border)]" />
              <DetailRow label="Total ingresos" value={money(collectedTotal || summary.totalCollected)} strong />
              <div className="my-2 border-t border-[var(--control-border)]" />
              <p className="text-sm font-semibold text-[var(--control-text)]">Anulaciones</p>
              <DetailRow label="Total monto" value={money(summary.voidedTotal)} />
              <DetailRow label="Total unds" value={String(summary.voidedCount ?? 0)} />
              <div className="my-2 border-t border-[var(--control-border)]" />
              <p className="text-sm font-semibold text-[var(--control-text)]">Salida operativa</p>
              <DetailRow label="Efectivo" value={money(operationalOuts.byMethod?.cash ?? 0)} />
              <DetailRow label="Tarjeta" value={money(operationalOuts.byMethod?.card ?? 0)} />
            </Panel>

            <Panel title="Cierre - Conteo de dinero">
              <MoneyInput label="Total efectivo" value={countedCash} onChange={setCountedCash} />
              <MoneyInput label="Total tarjeta" value={countedCard} onChange={setCountedCard} />
              <MoneyInput label="Total QR" value={countedQr} onChange={setCountedQr} />
              <MoneyInput label="Total transferencia" value={countedTransfer} onChange={setCountedTransfer} />
              <textarea className="control-input" placeholder="Observacion o motivo de reapertura" value={closureNotes} onChange={(event) => setClosureNotes(event.target.value)} />
            </Panel>

            <div className="xl:col-span-2">
              <Panel title="Resumen de cierre">
                <DetailRow label="Total cobrado" value={money(expectedTotal)} strong />
                <DetailRow label="Total contado" value={money(countedTotal)} strong />
                <DetailRow label="Diferencia" value={money(closureDifference)} strong />
                <div className="mt-2 flex flex-wrap gap-2">
                  {closure?.status === "closed" ? (
                    <button className="inline-flex items-center gap-2 rounded-lg border border-amber-400/50 px-4 py-2 text-amber-100 disabled:opacity-60" disabled={closureBusy} onClick={reopenCash}>
                      {closureBusy ? <Loader2 size={16} className="animate-spin" /> : null} Reabrir caja
                    </button>
                  ) : (
                    <>
                      {closureDifference < 0 ? <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--control-primary-border)] px-4 py-2 text-[var(--control-primary)] disabled:opacity-60" disabled={branchId === "all"} onClick={() => setReplenishmentModal({ suggestedAmount: Math.abs(closureDifference) })}>Justificar diferencia</button> : null}
                      <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--control-primary)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={closureBusy || Number(data?.pendingTickets?.length ?? 0) > 0} onClick={closeCash}>
                        {closureBusy ? <Loader2 size={16} className="animate-spin" /> : null} Cerrar caja
                      </button>
                    </>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )
      ) : null}

      {replenishmentModal ? (
        <StockReplenishmentModal
          branchId={branchId}
          branches={branches}
          suggestedAmount={replenishmentModal.suggestedAmount}
          onClose={() => setReplenishmentModal(null)}
          onSaved={async () => {
            setReplenishmentModal(null);
            await load();
          }}
        />
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-3"><p className="text-xs text-[var(--control-muted)]">{label}</p><p className="mt-1 truncate text-xl font-semibold text-[var(--control-text)]">{value}</p></div>;
}

function StockReplenishmentModal({
  branchId,
  branches,
  suggestedAmount,
  onClose,
  onSaved
}: {
  branchId: string;
  branches: BranchOption[];
  suggestedAmount?: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState(branchId === "all" ? "" : branchId);
  const [product, setProduct] = useState<SearchComboboxItem | null>(null);
  const [responsible, setResponsible] = useState<SearchComboboxItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount.toFixed(2)) : "");
  const [paymentMethod] = useState("efectivo");
  const [description, setDescription] = useState(suggestedAmount ? "Reposicion para justificar diferencia de caja" : "");
  const [occurredAt, setOccurredAt] = useState(toLocalDateTimeInput());
  const [saving, setSaving] = useState(false);
  const unitCost = Number(quantity || 0) > 0 ? Number(amount || 0) / Number(quantity || 1) : 0;

  async function save() {
    if (saving) return;
    if (!selectedBranchId) return showError("Sede requerida", "Selecciona una sede para registrar la salida.");
    if (!product) return showError("Producto requerido", "Selecciona el producto repuesto.");
    if (Number(quantity) <= 0 || Number(amount) <= 0) return showError("Datos invalidos", "Cantidad y monto deben ser mayores a cero.");
    const ok = await showConfirm("Registrar reposicion", `Se registrara una salida de caja por ${money(amount)} y una entrada de stock de ${quantity} unidad(es).`);
    if (!ok) return;
    setSaving(true);
    try {
      const response = await fetch("/api/control/cash/operational-movements/stock-replenishment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          productId: product.id,
          responsibleEmployeeId: responsible?.id,
          quantity: Number(quantity),
          amount: Number(amount),
          paymentMethod,
          description,
          occurredAt
        })
      });
      const result = await response.json();
      if (!response.ok) return showError("No se pudo registrar", result.error ?? "Revisa los datos.");
      await showSuccess("Reposicion registrada");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--control-primary)]">Salida operativa</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--control-text)]">Reposicion de stock con caja</h2>
            <p className="mt-1 text-sm text-[var(--control-muted)]">Registra el gasto y actualiza kardex en una sola operacion.</p>
          </div>
          <button className="rounded-lg border border-[var(--control-border)] px-3 py-2 text-sm" onClick={onClose}>Cerrar</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[var(--control-muted)]">
            Sede
            <select className="control-input" value={selectedBranchId} onChange={(event) => { setSelectedBranchId(event.target.value); setProduct(null); setResponsible(null); }}>
              <option value="">Seleccionar sede</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[var(--control-muted)]">
            Fecha y hora
            <input className="control-input" type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
          </label>
          <SearchCombobox disabled={!selectedBranchId} label="Producto" placeholder="Buscar producto por nombre o SKU" endpoint="/api/control/search/products" value={product} onSelect={setProduct} extraParams={{ branch_id: selectedBranchId }} />
          <SearchCombobox disabled={!selectedBranchId} label="Responsable" placeholder="Buscar empleado responsable" endpoint="/api/control/search/employees" value={responsible} onSelect={setResponsible} extraParams={{ branch_id: selectedBranchId }} />
          <MoneyInput label="Cantidad" value={quantity} onChange={setQuantity} />
          <MoneyInput label="Monto pagado" value={amount} onChange={setAmount} />
          <div className="rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-3">
            <p className="text-xs text-[var(--control-muted)]">Metodo</p>
            <p className="mt-1 font-semibold text-[var(--control-text)]">Efectivo fijo</p>
          </div>
          <div className="rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-3">
            <p className="text-xs text-[var(--control-muted)]">Costo unitario calculado</p>
            <p className="mt-1 text-xl font-semibold text-[var(--control-primary)]">{money(unitCost)}</p>
          </div>
          <label className="grid gap-2 text-sm text-[var(--control-muted)] md:col-span-2">
            Observacion / sustento
            <textarea className="control-input min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Compra de cera, shampoo o bebidas para reposicion de tienda." />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--control-primary)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={saving} onClick={save}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} Registrar reposicion
          </button>
          <button className="rounded-lg border border-[var(--control-border)] px-4 py-2" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[var(--control-muted)]">{label}</span><span className={strong ? "font-semibold text-[var(--control-primary)]" : "text-[var(--control-text)]"}>{value}</span></div>;
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm text-[var(--control-muted)]">
      {label}
      <input className="control-input" type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
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

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    efectivo: "Efectivo",
    cash: "Efectivo",
    tarjeta: "Tarjeta",
    card: "Tarjeta",
    qr: "QR",
    yape: "Yape",
    plin: "Plin",
    transferencia: "Transferencia",
    transfer: "Transferencia",
    mixto: "Mixto",
    mixed: "Mixto"
  };
  return labels[value] ?? value ?? "-";
}

function bucketPaymentMethodRows(rows: any[] = []) {
  return rows.reduce((totals, row) => {
    const method = String(row?.method ?? "").toLowerCase();
    const total = Number(row?.total ?? 0);
    if (method === "efectivo" || method === "cash") totals.cash += total;
    else if (method === "tarjeta" || method === "card") totals.card += total;
    else if (method === "yape" || method === "plin" || method === "qr") totals.qr += total;
    else if (method === "transferencia" || method === "transfer") totals.transfer += total;
    return totals;
  }, { cash: 0, card: 0, qr: 0, transfer: 0 });
}

function movementTypeLabel(value: string) {
  const labels: Record<string, string> = {
    walk_in: "Atencion directa",
    reservation: "Reserva",
    online_reservation: "Reserva web",
    product_sale: "Venta de productos",
    product_quick_sale: "Venta rapida",
    quick_sale: "Venta rapida",
    direct_sale: "Venta directa"
  };
  return labels[value] ?? value ?? "-";
}

function movementCategoryLabel(value: string) {
  const labels: Record<string, string> = {
    service: "Servicio",
    servicio: "Servicio",
    product: "Producto",
    producto: "Producto",
    snack: "Cafeteria",
    snacks: "Cafeteria",
    cafeteria: "Cafeteria",
    courtesy: "Cortesia"
  };
  return labels[value] ?? value ?? "-";
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    pagado: "Pagado",
    paid: "Pagado",
    pendiente_pago: "Pendiente de pago",
    pending_payment: "Pendiente de pago",
    anulado: "Anulado",
    voided: "Anulado",
    cancelado: "Cancelado",
    cancelled: "Cancelado"
  };
  return labels[value] ?? value ?? "-";
}

function toLocalDateTimeInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
