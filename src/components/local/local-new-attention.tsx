"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AttentionDraftSummary } from "@/components/attentions/attention-draft-summary";
import { AttentionSaveBar } from "@/components/attentions/attention-save-bar";
import { showError, showSuccess, showWarning } from "@/lib/ui/swal";

type Barber = { id: string; name: string; branchId: string };
type Service = { id: string; name: string; price: number | null; durationMinutes: number; branchId: string | null };
type Product = { id: string; name: string; sale_price: number; category?: string | null; counts_for_seller_credit?: boolean; seller_credit_amount?: number; product_branch_stock?: { branch_id: string; stock_current: number }[] };

export function LocalNewAttention() {
  const [token, setToken] = useState("");
  const [branchId, setBranchId] = useState("");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerPhone: "", customerName: "", employeeId: "", serviceId: "", total: "", observations: "" });
  const [additionName, setAdditionName] = useState("");
  const [additionAmount, setAdditionAmount] = useState("");
  const [additions, setAdditions] = useState<{ name: string; amount: number }[]>([]);
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
  const total = useMemo(() => {
    const serviceTotal = selectedService?.price == null ? Number(form.total || 0) : Number(selectedService.price);
    const additionsTotal = additions.reduce((sum, item) => sum + Number(item.amount), 0);
    const productsTotal = productItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return serviceTotal + additionsTotal + productsTotal;
  }, [additions, form.total, productItems, selectedService]);

  async function save() {
    const itemsCount = (form.serviceId ? 1 : 0) + additions.length + productItems.length;
    if (itemsCount === 0) return showError("Atencion sin items", "Agrega al menos un servicio, adicional o producto antes de guardar la atención.");
    setSaving(true);
    try {
      const response = await fetch("/api/local/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-local-token": token },
        body: JSON.stringify({ ...form, total, additions, productItems })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo guardar", data.error ?? "Revisa los datos.");
      await showSuccess("Atencion creada", "Queda pendiente de cobro en caja.");
      window.location.href = data.redirectTo;
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6">
      <section className="mx-auto grid max-w-6xl gap-5">
        <Header />
        {loading ? <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-6 text-sm text-[var(--text-muted)]">Cargando datos locales...</div> : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Cliente y barbero</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input label="Celular cliente" value={form.customerPhone} onChange={(value) => setForm({ ...form, customerPhone: value })} />
                <Input label="Nombre cliente" value={form.customerName} onChange={(value) => setForm({ ...form, customerName: value })} />
                <Select label="Barbero" value={form.employeeId} onChange={(value) => setForm({ ...form, employeeId: value })} options={barbers.map((barber) => ({ value: barber.id, label: barber.name }))} />
                <Select label="Servicio" value={form.serviceId} onChange={(value) => setForm({ ...form, serviceId: value, total: "" })} options={services.map((service) => ({ value: service.id, label: `${service.name} - ${service.price == null ? "A consultar" : `S/ ${Number(service.price).toFixed(2)}`}` }))} />
                <Input label="Monto manual" type="number" value={form.total} onChange={(value) => setForm({ ...form, total: value })} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Adicionales</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_140px_auto]">
                <Input label="Nombre" value={additionName} onChange={setAdditionName} />
                <Input label="Monto" type="number" value={additionAmount} onChange={setAdditionAmount} />
                <button className="self-end rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={() => {
                  if (!additionName || Number(additionAmount) <= 0) return;
                  setAdditions([...additions, { name: additionName, amount: Number(additionAmount) }]);
                  setAdditionName("");
                  setAdditionAmount("");
                }}>Agregar</button>
              </div>
              {additions.map((item, index) => <p key={index} className="mt-2 text-sm text-[var(--text-muted)]">{item.name}: S/ {item.amount.toFixed(2)}</p>)}
            </div>

            <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Productos / snacks</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
                <Select label="Producto" value={productId} onChange={setProductId} options={products.map((product) => ({ value: product.id, label: `${product.name} - S/ ${Number(product.sale_price).toFixed(2)}` }))} />
                <Input label="Cantidad" type="number" value={productQuantity} onChange={setProductQuantity} />
                <Select label="Vendedor" value={productSellerId} onChange={setProductSellerId} options={[{ value: "", label: "Recepcion / sin credito" }, ...barbers.map((barber) => ({ value: barber.id, label: barber.name }))]} />
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
              {productItems.map((item, index) => <p key={`${item.productId}-${index}`} className="mt-2 text-sm text-[var(--text-muted)]">{item.name} x {item.quantity}: S/ {(item.unitPrice * item.quantity).toFixed(2)}</p>)}
            </div>
          </div>

          <aside className="grid h-max gap-4 rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
            <AttentionDraftSummary total={total} itemsCount={(form.serviceId ? 1 : 0) + additions.length + productItems.length} />
            <AttentionSaveBar saving={saving} onClick={save} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-[var(--border-soft)] bg-black/50 p-5">
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
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Seleccionar</option>{options.map((option) => <option key={`${label}-${option.value || "none"}`} value={option.value}>{option.label}</option>)}</select></label>;
}
