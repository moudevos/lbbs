"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { PaymentMethodBadge } from "./payment-method-badge";
import { AttentionDraftSummary } from "@/components/attentions/attention-draft-summary";
import { AttentionSaveBar } from "@/components/attentions/attention-save-bar";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import type { BarberOption, BranchOption, ServiceOption } from "@/lib/reservations/types";

type Order = Record<string, any>;
type ProductOption = { id: string; sku: string; name: string; sale_price: number; category?: string | null; counts_for_seller_credit?: boolean; seller_credit_amount?: number; branch_id: string | null; product_branch_stock?: { branch_id: string; stock_current: number }[] };
type Options = { branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[]; products: ProductOption[] };

export function ServiceOrdersManager({ mine = false, createOpenInitially = false }: { mine?: boolean; createOpenInitially?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [options, setOptions] = useState<Options>({ branches: [], services: [], barbers: [], products: [] });
  const [me, setMe] = useState<{ role: string; branchId: string | null } | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(createOpenInitially);

  async function load() {
    const params = new URLSearchParams({ date });
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    const [ordersRes, optionsRes, meRes] = await Promise.all([
      fetch(`/api/control/service-orders?${params}`),
      fetch("/api/public/reservation-options"),
      fetch("/api/control/me")
    ]);
    const ordersData = await ordersRes.json();
    const optionsData = await optionsRes.json();
    const meData = await meRes.json();
    if (!ordersRes.ok) {
      await showError("No se pudo cargar", ordersData.error ?? "Error desconocido");
      return;
    }
    setOrders(ordersData.serviceOrders ?? []);
    const productsRes = await fetch(`/api/control/products?branch_id=${params.get("branch_id") ?? "all"}`);
    const productsData = await productsRes.json();
    setOptions({ branches: optionsData.branches ?? [], services: optionsData.services ?? [], barbers: optionsData.barbers ?? [], products: productsData.products ?? [] });
    setMe(meData.employee ?? null);
  }

  useEffect(() => {
    load();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function voidOrder(id: string) {
    if (!(await showConfirm("Anular servicio", "El servicio quedara anulado y auditado."))) return;
    const response = await fetch(`/api/control/service-orders/${id}/void`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo anular", data.error ?? "Intenta nuevamente.");
    await load();
  }

  async function redeem(id: string, rewardType: "classic_cut" | "voucher_30") {
    if (!(await showConfirm("Canjear recompensa", rewardType === "voucher_30" ? "Aplicara vale de S/30." : "Aplicara corte clasico gratis."))) return;
    const response = await fetch(`/api/control/service-orders/${id}/redeem`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardType }) });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo canjear", data.error ?? "Sin recompensa disponible.");
    await load();
    await showSuccess("Recompensa canjeada", `Descuento aplicado: S/ ${Number(data.discount ?? 0).toFixed(2)}`);
  }

  const canCreate = !mine && me?.role !== "barbero";

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{mine ? "Mis servicios" : "Atenciones"}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Servicios, productos, pagos, anulaciones y rewards.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          {canCreate ? <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 font-semibold text-black" onClick={() => setOpen(true)}><Plus size={16} /> Registrar atención</button> : null}
        </div>
      </div>

      {open && me ? <ServiceOrderForm me={me} options={options} embedded={createOpenInitially} onClose={() => setOpen(false)} onCreated={async () => { setOpen(false); await load(); }} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
          const barber = Array.isArray(order.employees) ? order.employees[0] : order.employees;
          const itemNames = (order.service_order_items ?? [])
            .filter((item: any) => item.item_type !== "reward_discount" && item.item_type !== "discount")
            .map((item: any) => item.name ?? item.description)
            .filter(Boolean);
          const rewards = Array.isArray(customer?.customer_reward_accounts) ? customer.customer_reward_accounts[0] : customer?.customer_reward_accounts;
          return (
            <article key={order.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--gold-soft)]">{order.status}</p>
                  <h2 className="mt-1 font-semibold">{customer?.full_name ?? "Cliente"}</h2>
                  <p className="text-sm text-[var(--text-muted)]">{itemNames.length ? itemNames.join(" + ") : "Sin items registrados"} - {barber ? `${barber.first_name} ${barber.last_name}` : "Sin barbero"}</p>
                </div>
                <p className="text-lg font-bold text-[var(--gold)]">S/ {Number(order.total ?? 0).toFixed(2)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                <span>Rewards: {rewards?.available_rewards ?? 0}</span>
                {(order.payment_details ?? []).map((payment: any, index: number) => <PaymentMethodBadge key={index} method={payment.method} />)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {order.status !== "pagado" && order.status !== "anulado" && !mine ? <Link className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={`/app/control/atenciones/${order.id}?focus=payment`}><ReceiptText size={16} /> Pagar</Link> : null}
                {Number(rewards?.available_rewards ?? 0) > 0 && order.status !== "anulado" && !mine ? (
                  <>
                    <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => redeem(order.id, "classic_cut")}>Corte gratis</button>
                    <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => redeem(order.id, "voucher_30")}>Vale S/30</button>
                  </>
                ) : null}
                {order.status !== "anulado" && !mine ? <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm text-red-200" onClick={() => voidOrder(order.id)}><Trash2 size={16} /> Anular</button> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ServiceOrderForm({ me, options, embedded = false, onClose, onCreated }: { me: { role: string; branchId: string | null }; options: Options; embedded?: boolean; onClose: () => void; onCreated: () => Promise<void> }) {
  const initialBranch = me.role === "recepcion" ? me.branchId ?? "" : "";
  const [form, setForm] = useState({
    branchId: initialBranch,
    customerPhone: "",
    customerName: "",
    employeeId: "",
    serviceId: "",
    total: "",
    observations: ""
  });
  const [additionName, setAdditionName] = useState("");
  const [additionAmount, setAdditionAmount] = useState("");
  const [additions, setAdditions] = useState<{ name: string; amount: number }[]>([]);
  const [productId, setProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState("1");
  const [productSellerId, setProductSellerId] = useState("");
  const [productItems, setProductItems] = useState<{ productId: string; name: string; quantity: number; unitPrice: number; stock: number; soldByEmployeeId?: string | null; creditLabel?: string }[]>([]);
  const [customerLookup, setCustomerLookup] = useState<{ found: boolean; totalVisits?: number; availableRewards?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const branchServices = options.services.filter((service) => !form.branchId || !service.branchId || service.branchId === form.branchId);
  const branchBarbers = options.barbers.filter((barber) => !form.branchId || barber.branchId === form.branchId);
  const branchProducts = options.products.filter((product) => !form.branchId || !product.branch_id || product.branch_id === form.branchId);
  const selectedService = useMemo(() => branchServices.find((service) => service.id === form.serviceId), [branchServices, form.serviceId]);
  const computedTotal = useMemo(() => {
    const serviceTotal = selectedService?.price == null ? Number(form.total || 0) : Number(selectedService.price);
    const additionsTotal = additions.reduce((sum, item) => sum + Number(item.amount), 0);
    const productsTotal = productItems.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
    return serviceTotal + additionsTotal + productsTotal;
  }, [additions, form.total, productItems, selectedService]);

  useEffect(() => {
    if (selectedService?.price != null && !form.total) setForm((current) => ({ ...current, total: String(selectedService.price) }));
  }, [selectedService, form.total]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/control/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total: computedTotal,
          additions,
          productItems: productItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, soldByEmployeeId: item.soldByEmployeeId ?? null }))
        })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo registrar", data.error ?? "Revisa los datos.");
      await onCreated();
      await showSuccess("Atención registrada");
    } finally {
      setSaving(false);
    }
  }

  async function findCustomer() {
    if (!form.customerPhone) return;
    const response = await fetch(`/api/control/customers/lookup?phone=${encodeURIComponent(form.customerPhone)}`);
    const data = await response.json();
    if (response.ok && data.found) {
      setCustomerLookup({ found: true, totalVisits: data.customer.totalVisits, availableRewards: data.customer.availableRewards });
      setForm((current) => ({ ...current, customerName: data.customer.name ?? current.customerName }));
      await showSuccess("Cliente encontrado", "Se reutilizara el cliente existente.");
    } else if (response.ok) {
      setCustomerLookup({ found: false });
    }
  }

  return (
    <div className={embedded ? "mx-auto grid max-w-5xl px-0 py-0" : "fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6"}>
      <form onSubmit={submit} className={embedded ? "w-full rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5" : "max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5"}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Atención directa</p><h2 className="mt-2 text-2xl font-semibold">Registrar atención</h2></div>
          <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={onClose}>{embedded ? "Volver" : "Cerrar"}</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Select label="Sede" value={form.branchId} disabled={me.role === "recepcion"} onChange={(value) => setForm({ ...form, branchId: value, employeeId: "", serviceId: "" })} options={options.branches.map((branch) => ({ value: branch.id, label: branch.name }))} />
          <label className="text-sm text-[var(--text-muted)]">Celular cliente
            <div className="mt-2 flex gap-2">
              <input className="min-w-0 flex-1 rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.customerPhone} onChange={(event) => { setForm({ ...form, customerPhone: event.target.value }); setCustomerLookup(null); }} />
              <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={findCustomer}>Buscar</button>
            </div>
            {customerLookup?.found ? <span className="mt-2 inline-flex rounded-md border border-green-400/40 px-2 py-1 text-xs text-green-200">Cliente encontrado - {customerLookup.totalVisits ?? 0} atenciones - {customerLookup.availableRewards ?? 0} rewards</span> : null}
            {customerLookup?.found === false ? <span className="mt-2 inline-flex rounded-md border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">Cliente no encontrado. Se creará al guardar.</span> : null}
          </label>
          <Input label="Nombre cliente" value={form.customerName} onChange={(value) => setForm({ ...form, customerName: value })} />
          <Select label="Barbero" value={form.employeeId} onChange={(value) => setForm({ ...form, employeeId: value })} options={branchBarbers.map((barber) => ({ value: barber.id, label: barber.name }))} />
          <Select label="Servicio principal" value={form.serviceId} onChange={(value) => setForm({ ...form, serviceId: value, total: "" })} options={branchServices.map((service) => ({ value: service.id, label: `${service.name} - ${service.price == null ? "A consultar" : `S/ ${service.price}`}` }))} />
          <Input label="Monto servicio manual" type="number" value={form.total} onChange={(value) => setForm({ ...form, total: value })} />
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border-soft)] bg-black/25 p-3">
          <p className="text-sm font-semibold">Adicionales</p>
          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
            <Input label="Nombre" value={additionName} onChange={setAdditionName} />
            <Input label="Monto" type="number" value={additionAmount} onChange={setAdditionAmount} />
            <button type="button" className="self-end rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={() => {
              if (!additionName || Number(additionAmount) <= 0) return;
              setAdditions([...additions, { name: additionName, amount: Number(additionAmount) }]);
              setAdditionName("");
              setAdditionAmount("");
            }}>Agregar</button>
          </div>
          {additions.map((item, index) => <p key={index} className="mt-2 text-sm text-[var(--text-muted)]">{item.name}: S/ {item.amount.toFixed(2)}</p>)}
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border-soft)] bg-black/25 p-3">
          <p className="text-sm font-semibold">Productos / bebidas</p>
          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_120px_auto]">
            <label className="text-sm text-[var(--text-muted)]">Producto
              <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Seleccionar</option>
                {branchProducts.map((product) => {
                  const stock = product.product_branch_stock?.find((item) => item.branch_id === form.branchId)?.stock_current ?? 0;
                  return <option key={product.id} value={product.id}>{product.name} - S/ {Number(product.sale_price).toFixed(2)} - stock {stock}</option>;
                })}
              </select>
            </label>
            <Input label="Cantidad" type="number" value={productQuantity} onChange={setProductQuantity} />
            <label className="text-sm text-[var(--text-muted)]">Vendedor
              <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={productSellerId} onChange={(event) => setProductSellerId(event.target.value)}>
                <option value="">Recepcion / sin credito</option>
                {branchBarbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
              </select>
            </label>
            <button type="button" className="self-end rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={() => {
              const product = branchProducts.find((item) => item.id === productId);
              const quantity = Math.trunc(Number(productQuantity));
              if (!product || quantity <= 0) return;
              const stock = product.product_branch_stock?.find((item) => item.branch_id === form.branchId)?.stock_current ?? 0;
              if (quantity > Number(stock)) {
                showError("Stock insuficiente", `Solo hay ${stock} unidad(es) en esta sede.`);
                return;
              }
              const countsCredit = Boolean(product.counts_for_seller_credit || product.category === "barber_product");
              setProductItems([...productItems, {
                productId: product.id,
                name: product.name,
                quantity,
                unitPrice: Number(product.sale_price),
                stock: Number(stock),
                soldByEmployeeId: productSellerId || null,
                creditLabel: countsCredit && productSellerId ? `Suma S/ ${Number(product.seller_credit_amount ?? 2).toFixed(2)} al vendedor por unidad` : "No suma incentivo"
              }]);
              setProductId("");
              setProductQuantity("1");
              setProductSellerId("");
            }}>Agregar</button>
          </div>
          {productItems.map((item, index) => (
            <div key={`${item.productId}-${index}`} className="mt-2 flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm">
              <span>{item.name} x {item.quantity}<span className="ml-2 text-xs text-[var(--gold-soft)]">{item.creditLabel}</span></span>
              <span>S/ {(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <label className="mt-4 block text-sm text-[var(--text-muted)]">Observaciones
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} />
        </label>
        <AttentionDraftSummary total={computedTotal} itemsCount={(form.serviceId ? 1 : 0) + additions.length + productItems.length} />
        <AttentionSaveBar saving={saving} />
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
