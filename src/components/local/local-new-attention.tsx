"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AttentionDraftSummary } from "@/components/attentions/attention-draft-summary";
import { AttentionSaveBar } from "@/components/attentions/attention-save-bar";
import { showError, showSuccess, showWarning } from "@/lib/ui/swal";
import { ControlCombobox } from "@/components/ui/control-combobox";
import { GENERIC_CUSTOMER_PHONE, isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";
import { createClientId } from "@/lib/browser/create-client-id";
import { FormLoadingOverlay } from "@/components/ui/loading-state";

type Barber = { id: string; name: string; branchId: string };
type Service = { id: string; sku: string; name: string; price: number | null; durationMinutes: number; branchId: string | null };
type Product = { id: string; name: string; sale_price: number; category?: string | null; counts_for_seller_credit?: boolean; seller_credit_amount?: number; product_branch_stock?: { branch_id: string; stock_current: number }[] };
type ServiceDraft = { key: string; serviceId: string; name: string; amount: number; courtesy: string };

export function LocalNewAttention() {
  const [token, setToken] = useState("");
  const [branchId, setBranchId] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [form, setForm] = useState({ customerPhone: "", customerName: "", employeeId: "", serviceId: "", total: "", observations: "" });
  const [serviceItems, setServiceItems] = useState<ServiceDraft[]>([]);
  const [customMode, setCustomMode] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [customCourtesy, setCustomCourtesy] = useState("");
  const [productId, setProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState("1");
  const [productSellerId, setProductSellerId] = useState("");
  const [productItems, setProductItems] = useState<{ productId: string; name: string; quantity: number; unitPrice: number; soldByEmployeeId?: string | null }[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem("lbbs:localToken") ?? "";
    setToken(savedToken);
    load(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextToken = token) {
    if (!nextToken) {
      setLoading(false);
      await showWarning("Token requerido", "Escanea el QR del dispositivo antes de crear atenciones.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/local/agenda", { headers: { "x-local-token": nextToken } });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar datos locales", data.error ?? "Token invalido.");
    setBranchId(data.branchId ?? "");
    setBarbers(data.barbers ?? []);
    setServices(data.services ?? []);
    setProducts(data.products ?? []);
  }

  const selectedService = useMemo(() => services.find((service) => service.id === form.serviceId), [form.serviceId, services]);
  const customService = services.find((service) => service.sku === "CUSTOM");
  const standardServices = services.filter((service) => service.sku !== "CUSTOM");
  const total = useMemo(() => {
    const serviceTotal = customMode ? Number(form.total || 0) : serviceItems.reduce((sum, service) => sum + service.amount, 0);
    const productsTotal = productItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return serviceTotal + productsTotal;
  }, [customMode, form.total, productItems, serviceItems]);

  async function lookupCustomer() {
    if (lookingUp || form.customerPhone.length !== 9) return;
    if (isGenericCustomerPhone(form.customerPhone)) {
      setCustomerFound(true);
      setForm((current) => ({ ...current, customerName: "Cliente generico" }));
      return;
    }
    setLookingUp(true);
    try {
      const response = await fetch(`/api/local/customers/lookup?phone=${form.customerPhone}`, { headers: { "x-local-token": token } });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo buscar cliente", data.error);
      setCustomerFound(Boolean(data.found));
      setForm((current) => ({ ...current, customerName: data.found ? data.customer.name : "" }));
    } finally {
      setLookingUp(false);
    }
  }

  async function save() {
    const itemsCount = (customMode ? 1 : serviceItems.length) + productItems.length;
    if (itemsCount === 0) return showError("Atencion sin items", "Agrega al menos un servicio o producto antes de guardar la atencion.");
    if (customMode && (!customService || !customDescription.trim() || Number(form.total) <= 0)) {
      return showError("Personalizado incompleto", "Describe el servicio en observaciones e ingresa un precio mayor a 0.");
    }
    setSaving(true);
    try {
      const response = await fetch("/api/local/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-local-token": token },
        body: JSON.stringify({
          ...form,
          customerName: isGenericCustomerPhone(form.customerPhone) ? "Cliente generico" : form.customerName.trim(),
          serviceId: customMode ? customService?.id : serviceItems[0]?.serviceId ?? null,
          total: customMode ? Number(form.total) : serviceItems[0]?.amount ?? 0,
          additionalServiceIds: customMode ? [] : serviceItems.slice(1).map((service) => service.serviceId),
          courtesyItems: customMode ? (customCourtesy ? [customCourtesy] : []) : serviceItems.map((service) => service.courtesy).filter(Boolean),
          observations: customMode ? `${form.observations}\nPersonalizado: ${customDescription}\nServicios de referencia: ${serviceItems.map((service) => service.name).join(", ")}`.trim() : form.observations,
          customDescription: customMode ? customDescription.trim() : null,
          additions: [],
          productItems: productItems.map((item) => ({ ...item, soldByEmployeeId: item.soldByEmployeeId || form.employeeId }))
        })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo guardar", data.error ?? "Revisa los datos.");
      await showSuccess("Enviado a caja", "La atencion queda pendiente de cobro y caja la recibira en tiempo real.");
      window.location.href = data.redirectTo;
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--control-bg)] px-4 py-20 text-[var(--control-text)]">
      <section className="mx-auto grid max-w-6xl gap-5">
        <Header />
        {loading ? <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-6 text-sm text-[var(--control-muted)]"><Loader2 size={17} className="animate-spin" /> Cargando datos locales...</div> : null}
        <div className="relative grid gap-4 lg:grid-cols-[1fr_340px]">
          <FormLoadingOverlay show={saving} />
          <div className="grid gap-4">
            <Panel title="1. Cliente">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]"><input className="control-input" maxLength={9} placeholder="Celular de 9 digitos" value={form.customerPhone} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), void lookupCustomer())} onChange={(event) => { const phone = event.target.value.replace(/\D/g, ""); setForm({ ...form, customerPhone: phone, customerName: phone === GENERIC_CUSTOMER_PHONE ? "Cliente generico" : "" }); setCustomerFound(phone === GENERIC_CUSTOMER_PHONE ? true : null); }} /><button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--control-border)] px-4 py-2" disabled={lookingUp} onClick={lookupCustomer}>{lookingUp ? <Loader2 size={15} className="animate-spin" /> : null} Buscar</button><input className="control-input" disabled={lookingUp || customerFound === true} placeholder="Nombre" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></div>
              {customerFound === true ? <p className="text-xs text-green-300">Cliente encontrado.</p> : null}{customerFound === false ? <p className="text-xs text-[var(--gold-soft)]">Cliente nuevo. Se creara al guardar.</p> : null}
            </Panel>
            <Panel title="2. Servicios">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><ControlCombobox value={form.serviceId} placeholder="Buscar servicio" options={standardServices.map((service) => ({ value: service.id, label: `${service.name} · S/ ${Number(service.price ?? 0).toFixed(2)}`, searchText: service.sku }))} onChange={(value) => setForm({ ...form, serviceId: value })} /><button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--control-primary)] px-4 py-2" onClick={() => { if (!selectedService) return; setServiceItems([...serviceItems, { key: createClientId(), serviceId: selectedService.id, name: selectedService.name, amount: Number(selectedService.price ?? 0), courtesy: "" }]); setForm({ ...form, serviceId: "" }); }}><Plus size={16} /> Agregar</button></div>
              {serviceItems.map((service) => <div key={service.key} className="grid gap-2 rounded-lg border border-[var(--control-border)] p-3 md:grid-cols-[1fr_220px_auto]"><div><strong>{service.name}</strong><p className="text-xs text-[var(--control-muted)]">S/ {service.amount.toFixed(2)}</p></div>{!customMode ? <select className="control-input" value={service.courtesy} onChange={(event) => setServiceItems(serviceItems.map((item) => item.key === service.key ? { ...item, courtesy: event.target.value } : item))}><option value="">Sin cortesia</option>{courtesyOptions(service.amount).map((value) => <option key={value}>{value}</option>)}</select> : <span className="text-xs">Referencia interna</span>}<button onClick={() => setServiceItems(serviceItems.filter((item) => item.key !== service.key))}><Trash2 size={16} /></button></div>)}
              <label className="flex items-center gap-2 rounded-lg border border-[var(--control-border)] bg-[var(--control-surface-2)] px-3 py-2 text-sm"><input type="checkbox" checked={customMode} onChange={(event) => setCustomMode(event.target.checked)} /> Registrar servicio personalizado</label>
              {customMode ? <div className="grid gap-3 rounded-xl border border-[var(--control-primary-border)] bg-[var(--control-primary-soft)] p-3 sm:grid-cols-2"><input className="control-input" placeholder="Descripcion del personalizado" value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} /><input className="control-input" type="number" placeholder="Precio total" value={form.total} onChange={(event) => setForm({ ...form, total: event.target.value })} /><div className="sm:col-span-2"><ControlCombobox value={customCourtesy} placeholder="Cortesia del personalizado" options={courtesyOptions(Number(form.total || 0)).map((label) => ({ value: label, label }))} onChange={setCustomCourtesy} /></div></div> : null}
            </Panel>

            <div className="rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 shadow-[var(--control-shadow)]">
              <h2 className="font-semibold">Productos / snacks</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
                <label className="text-sm text-[var(--control-muted)]">Producto<ControlCombobox value={productId} placeholder="Buscar producto" options={products.map((product) => ({ value: product.id, label: `${product.name} - S/ ${Number(product.sale_price).toFixed(2)}` }))} onChange={setProductId} /></label>
                <Input label="Cantidad" type="number" value={productQuantity} onChange={setProductQuantity} />
                <Select label="Vendedor" value={productSellerId} onChange={setProductSellerId} options={[{ value: "", label: "Barbero de la atencion" }, ...barbers.map((barber) => ({ value: barber.id, label: barber.name }))]} />
                <button className="self-end rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={() => {
                  const product = products.find((item) => item.id === productId);
                  const quantity = Math.trunc(Number(productQuantity));
                  if (!product || quantity <= 0) return;
                  const stock = product.product_branch_stock?.find((item) => item.branch_id === branchId)?.stock_current ?? 0;
                  if (quantity > stock) return showError("Stock insuficiente", `Solo hay ${stock} unidad(es).`);
                  setProductItems([...productItems, { productId: product.id, name: product.name, quantity, unitPrice: Number(product.sale_price), soldByEmployeeId: productSellerId || null }]);
                  setProductId("");
                  setProductQuantity("1");
                  setProductSellerId("");
                }}>Agregar</button>
              </div>
              <div className="mt-3 grid gap-2">{productItems.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--control-border)] p-3 text-sm"><span>{item.name} x {item.quantity}: S/ {(item.unitPrice * item.quantity).toFixed(2)}</span><button type="button" className="inline-flex items-center gap-1 text-red-300 disabled:opacity-50" disabled={saving} onClick={() => setProductItems(productItems.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /> Quitar</button></div>)}</div>
            </div>
            <Panel title="4. Barbero y observaciones"><ControlCombobox value={form.employeeId} placeholder="Seleccionar barbero" options={barbers.map((barber) => ({ value: barber.id, label: barber.name }))} onChange={(value) => setForm({ ...form, employeeId: value })} /><textarea className="control-input min-h-24" placeholder="Observaciones" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} /></Panel>
          </div>

          <aside className="grid h-max gap-4 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 shadow-[var(--control-shadow)]">
            <AttentionDraftSummary total={total} itemsCount={(customMode ? 1 : serviceItems.length) + productItems.length} />
            <AttentionSaveBar saving={saving} onClick={save} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5 shadow-[var(--control-shadow)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Modo local</p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Nueva atencion</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Borrador local: no crea orden ni descuenta stock hasta guardar.</p>
        </div>
        <Link className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/local/agenda">Volver a agenda</Link>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm text-[var(--control-muted)]">{label}<input className="control-input mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="text-sm text-[var(--control-muted)]">{label}<select className="control-input mt-2" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={`${label}-${option.value || "none"}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function courtesyOptions(amount: number) {
  return amount > 60 ? ["Frozen de fruta", "Cafe americano + keke de platano", "Capuchino + keke de platano", "Gaseosa + keke de platano"] : ["Agua", "Gaseosa personal"];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="grid min-w-0 gap-3 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4 shadow-sm"><h2 className="font-semibold">{title}</h2>{children}</section>;
}
