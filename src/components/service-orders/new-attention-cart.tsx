"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AttentionDraftSummary } from "@/components/attentions/attention-draft-summary";
import { showError, showSuccess } from "@/lib/ui/swal";
import type { BarberOption, BranchOption, ServiceOption } from "@/lib/reservations/types";
import { ControlCombobox } from "@/components/ui/control-combobox";
import { GENERIC_CUSTOMER_PHONE, isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";
import { createClientId } from "@/lib/browser/create-client-id";

type Product = { id: string; name: string; sale_price: number; branch_id: string | null; product_branch_stock?: { branch_id: string; stock_current: number }[] };
type ServiceDraft = { key: string; serviceId: string; name: string; amount: number; description: string; courtesy: string };
type ProductDraft = { key: string; productId: string; name: string; quantity: number; unitPrice: number; soldByEmployeeId: string | null };

export function NewAttentionCart() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [fixedBranch, setFixedBranch] = useState(false);
  const [options, setOptions] = useState<{ branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[]; products: Product[] }>({ branches: [], services: [], barbers: [], products: [] });
  const [form, setForm] = useState({ branchId: "", customerPhone: "", customerName: "", employeeId: "", observations: "" });
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customCourtesy, setCustomCourtesy] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellerId, setSellerId] = useState("");
  const [products, setProducts] = useState<ProductDraft[]>([]);

  useEffect(() => {
    void (async () => {
      const [meResponse, optionsResponse] = await Promise.all([fetch("/api/control/me"), fetch("/api/public/reservation-options")]);
      const meData = await meResponse.json();
      const optionsData = await optionsResponse.json();
      const branchId = meData.employee?.branchId ?? "";
      const productsResponse = await fetch(`/api/control/products?branch_id=${branchId || "all"}`);
      const productsData = await productsResponse.json();
      setFixedBranch(Boolean(branchId));
      setForm((current) => ({ ...current, branchId }));
      setOptions({ branches: optionsData.branches ?? [], services: optionsData.services ?? [], barbers: optionsData.barbers ?? [], products: productsData.products ?? [] });
      setLoading(false);
    })();
  }, []);

  const customService = options.services.find((item) => item.sku === "CUSTOM");
  const branchServices = options.services.filter((item) => item.sku !== "CUSTOM" && (!item.branchId || item.branchId === form.branchId));
  const branchBarbers = options.barbers.filter((item) => item.branchId === form.branchId);
  const branchProducts = options.products.filter((item) => !item.branch_id || item.branch_id === form.branchId);
  const selectedService = branchServices.find((item) => item.id === serviceId);
  const selectedProduct = branchProducts.find((item) => item.id === productId);
  const serviceTotal = customMode ? Number(customAmount || 0) : services.reduce((sum, item) => sum + item.amount, 0);
  const total = useMemo(() => serviceTotal + products.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [products, serviceTotal]);

  async function lookupCustomer() {
    if (lookingUp || form.customerPhone.length !== 9) return;
    if (isGenericCustomerPhone(form.customerPhone)) {
      setCustomerFound(true);
      setForm((current) => ({ ...current, customerName: "Cliente generico" }));
      return;
    }
    setLookingUp(true);
    try {
      const response = await fetch(`/api/control/customers/lookup?phone=${form.customerPhone}`);
      const data = await response.json();
      if (!response.ok) return showError("No se pudo buscar cliente", data.error);
      setCustomerFound(Boolean(data.found));
      if (data.found) setForm((current) => ({ ...current, customerName: data.customer.name }));
    } finally {
      setLookingUp(false);
    }
  }

  function addService() {
    if (!selectedService) return;
    const amount = Number(selectedService.price ?? 0);
    setServices((current) => [...current, { key: createClientId(), serviceId: selectedService.id, name: selectedService.name, amount, description: selectedService.name, courtesy: "" }]);
    setServiceId("");
  }

  function addProduct() {
    const requested = Math.trunc(Number(quantity));
    if (!selectedProduct || requested <= 0) return;
    const stock = selectedProduct.product_branch_stock?.find((item) => item.branch_id === form.branchId)?.stock_current ?? 0;
    if (requested > stock) return void showError("Stock insuficiente", `Disponible: ${stock}`);
    setProducts((current) => [...current, { key: createClientId(), productId: selectedProduct.id, name: selectedProduct.name, quantity: requested, unitPrice: Number(selectedProduct.sale_price), soldByEmployeeId: sellerId || null }]);
    setProductId(""); setQuantity("1"); setSellerId("");
  }

  async function save() {
    if (saving) return;
    const genericCustomer = isGenericCustomerPhone(form.customerPhone);
    const customerName = genericCustomer ? "Cliente generico" : form.customerName.trim();
    if (!form.branchId || !form.customerPhone || !customerName || !form.employeeId) return showError("Datos incompletos", "Completa sede, cliente y barbero.");
    if (!services.length && !products.length) return showError("Atencion vacia", "Agrega al menos un servicio o producto.");
    if (customMode && (!customService || !customDescription.trim() || Number(customAmount) <= 0)) return showError("Personalizado incompleto", "Ingresa descripcion y precio total mayor a 0.");
    setSaving(true);
    try {
      const first = customMode
        ? { serviceId: customService!.id, amount: Number(customAmount), description: customDescription.trim(), name: "Personalizado" }
        : services[0];
      const references = customMode ? `Servicios de referencia: ${services.map((item) => item.name).join(", ")}` : "";
      const response = await fetch("/api/control/service-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form, customerName, serviceId: first?.serviceId ?? null, total: first?.amount ?? 0, additions: [],
          observations: customMode ? `${form.observations}\nPersonalizado: ${customDescription.trim()}\n${references}`.trim() : form.observations,
          productItems: products.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, soldByEmployeeId: item.soldByEmployeeId }))
        })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo guardar", data.error);
      for (const item of customMode ? [] : services.slice(1)) {
        const itemResponse = await fetch(`/api/control/service-orders/${data.serviceOrderId}/items`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: "service", serviceId: item.serviceId, amount: item.amount, description: item.description })
        });
        if (!itemResponse.ok) return showError("Atencion creada parcialmente", (await itemResponse.json()).error);
      }
      const courtesyItems = customMode
        ? (customCourtesy ? [{ courtesy: customCourtesy }] : [])
        : services.filter((entry) => entry.courtesy);
      for (const item of courtesyItems) {
        await fetch(`/api/control/service-orders/${data.serviceOrderId}/items`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: "courtesy", courtesyType: item.courtesy })
        });
      }
      await showSuccess("Atencion registrada");
      window.location.href = data.redirectTo;
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 className="animate-spin" size={16} /> Cargando nueva atencion...</p>;

  return (
    <section className="mx-auto grid min-w-0 max-w-[1500px] gap-4 overflow-x-hidden">
      <div><p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Atencion directa</p><h1 className="mt-2 text-3xl font-semibold">Nueva atencion</h1></div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-4">
          <Panel title="1. Sede"><ControlCombobox disabled={fixedBranch} value={form.branchId} placeholder="Seleccionar sede" options={options.branches.map((item) => ({ value: item.id, label: item.name, searchText: item.code }))} onChange={(value) => setForm({ ...form, branchId: value, employeeId: "" })} /></Panel>
          <Panel title="2. Cliente">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]"><input className="control-input" maxLength={9} placeholder="Celular de 9 digitos" value={form.customerPhone} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), void lookupCustomer())} onChange={(event) => { const phone = event.target.value.replace(/\D/g, ""); setForm({ ...form, customerPhone: phone, customerName: phone === GENERIC_CUSTOMER_PHONE ? "Cliente generico" : form.customerName }); setCustomerFound(phone === GENERIC_CUSTOMER_PHONE ? true : null); }} /><button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] px-4 py-2" disabled={lookingUp} onClick={lookupCustomer}>{lookingUp ? <Loader2 className="animate-spin" size={15} /> : null} Buscar</button><input className="control-input" disabled={lookingUp || customerFound === true} placeholder="Nombre" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></div>
            {customerFound === true ? <p className="text-xs text-green-300">Cliente encontrado.</p> : null}{customerFound === false ? <p className="text-xs text-[var(--gold-soft)]">Cliente nuevo. Se creara al guardar.</p> : null}
          </Panel>
          <Panel title="3. Servicios">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><ControlCombobox value={serviceId} placeholder="Buscar servicio" options={branchServices.map((item) => ({ value: item.id, label: `${item.name} · S/ ${Number(item.price ?? 0).toFixed(2)}`, searchText: item.sku }))} onChange={setServiceId} /><button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--control-primary)] px-4 py-2" onClick={addService}><Plus size={16} /> Agregar</button></div>
            {services.map((item) => <div key={item.key} className="grid gap-2 rounded-lg border border-[var(--border-soft)] p-3 md:grid-cols-[1fr_220px_auto]"><div><strong>{item.name}</strong><p className="text-xs text-[var(--text-muted)]">S/ {item.amount.toFixed(2)}</p></div>{!customMode ? <select className="control-input" value={item.courtesy} onChange={(event) => setServices((current) => current.map((entry) => entry.key === item.key ? { ...entry, courtesy: event.target.value } : entry))}><option value="">Sin cortesia</option>{courtesyOptions(item.amount).map((value) => <option key={value} value={value}>{value}</option>)}</select> : <span className="text-xs text-[var(--control-muted)]">Referencia interna</span>}<button onClick={() => setServices((current) => current.filter((entry) => entry.key !== item.key))}><Trash2 size={16} /></button></div>)}
            {services.length ? <label className="flex items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--control-surface-2)] px-3 py-2 text-sm"><input type="checkbox" checked={customMode} onChange={(event) => setCustomMode(event.target.checked)} /> Marcar como servicio personalizado</label> : null}
            {customMode ? <div className="grid min-w-0 gap-3 rounded-xl border border-[var(--control-primary-border)] bg-[var(--control-primary-soft)] p-3 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-sm font-semibold text-[var(--control-primary)]">Personalizado</p><p className="text-xs text-[var(--control-muted)]">Agrupa los servicios seleccionados en un solo servicio con precio final manual.</p></div><input className="control-input" placeholder="Descripcion del personalizado" value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} /><input className="control-input" type="number" placeholder="Precio total personalizado" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} /><div className="sm:col-span-2"><ControlCombobox value={customCourtesy} placeholder="Cortesia del personalizado" options={courtesyOptions(Number(customAmount || 0)).map((label) => ({ value: label, label }))} onChange={setCustomCourtesy} /></div></div> : null}
          </Panel>
          <Panel title="4. Productos">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)_auto]"><ControlCombobox value={productId} placeholder="Buscar producto" options={branchProducts.map((item) => ({ value: item.id, label: item.name }))} onChange={setProductId} /><input className="control-input" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /><ControlCombobox value={sellerId} placeholder="Recepcion" options={branchBarbers.map((item) => ({ value: item.id, label: item.name }))} onChange={setSellerId} /><button className="rounded-lg border border-[var(--control-primary)] px-4 py-2" onClick={addProduct}>Agregar</button></div>
            {products.map((item) => <div key={item.key} className="flex justify-between rounded-lg border border-[var(--border-soft)] p-3"><span>{item.name} x {item.quantity}</span><button onClick={() => setProducts((current) => current.filter((entry) => entry.key !== item.key))}><Trash2 size={16} /></button></div>)}
          </Panel>
          <Panel title="5. Barbero y observaciones"><ControlCombobox value={form.employeeId} placeholder="Seleccionar barbero" options={branchBarbers.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => setForm({ ...form, employeeId: value })} /><textarea className="control-input min-h-24" placeholder="Observaciones" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} /></Panel>
        </div>
        <aside className="grid h-max min-w-0 gap-4 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 shadow-[var(--control-shadow)] xl:sticky xl:top-4"><AttentionDraftSummary total={total} itemsCount={services.length + products.length} /><button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--control-primary)] px-4 py-3 font-semibold text-[var(--control-primary-text)] hover:bg-[var(--control-primary-hover)] disabled:opacity-60" disabled={saving} onClick={save}>{saving ? <Loader2 className="animate-spin" size={16} /> : null} Guardar y continuar a pago</button></aside>
      </div>
    </section>
  );
}

function courtesyOptions(amount: number) {
  return amount > 60 ? ["Frozen de fruta", "Cafe americano + keke de platano", "Capuchino + keke de platano", "Gaseosa + keke de platano"] : ["Agua", "Gaseosa personal"];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid min-w-0 gap-3 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 shadow-sm"><h2 className="font-semibold">{title}</h2>{children}</section>;
}
