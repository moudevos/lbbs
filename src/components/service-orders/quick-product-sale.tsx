"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PaymentSplitEditor } from "./payment-split-editor";
import { SearchCombobox, type SearchComboboxItem } from "@/components/ui/search-combobox";
import { showError, showSuccess } from "@/lib/ui/swal";
import type { PaymentMethod, PaymentSplit } from "@/lib/service-orders/types";

type CartItem = {
  product: SearchComboboxItem;
  quantity: number;
};

export function QuickProductSale() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [employeeBranchId, setEmployeeBranchId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [customer, setCustomer] = useState<SearchComboboxItem | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [barber, setBarber] = useState<SearchComboboxItem | null>(null);
  const [product, setProduct] = useState<SearchComboboxItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"save" | "ticket" | null>(null);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const [meResponse, optionsResponse] = await Promise.all([fetch("/api/control/me"), fetch("/api/public/reservation-options")]);
      const me = await meResponse.json();
      const options = await optionsResponse.json();
      setRole(me.employee?.role ?? "");
      setEmployeeBranchId(me.employee?.branchId ?? "");
      setBranchId(me.employee?.role === "admin" ? localStorage.getItem("lbbs:branchScope") ?? "all" : me.employee?.branchId ?? "");
      setBranches(options.branches ?? []);
    }
    void load();
  }, []);

  const selectedBranchId = role === "admin" ? branchId : employeeBranchId;
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + price(item.product) * item.quantity, 0), [cart]);
  const estimatedIncentive = useMemo(() => barber ? cart.reduce((sum, item) => {
    return sum + (item.product.metadata?.countsForSellerCredit ? Number(item.product.metadata?.sellerCreditAmount || 2) * item.quantity : 0);
  }, 0) : 0, [barber, cart]);

  function addProduct() {
    if (!product) return;
    const stock = Number(product.metadata?.stock ?? 0);
    if (stock <= 0) return void showError("Sin stock", "Este producto no tiene stock disponible en la sede.");
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, stock) } : item);
      return [...current, { product, quantity: 1 }];
    });
    setProduct(null);
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) => current.map((item) => {
      if (item.product.id !== productId) return item;
      const stock = Number(item.product.metadata?.stock ?? 0);
      return { ...item, quantity: Math.max(1, Math.min(Math.trunc(quantity || 1), stock || 1)) };
    }));
  }

  async function lookupCustomer() {
    if (lookingUpCustomer) return;
    if (!customerPhone || customerPhone.length !== 9) {
      setCustomer(null);
      setCustomerFound(null);
      return showError("Celular invalido", "Ingresa un celular de 9 digitos o usa cliente generico.");
    }
    setLookingUpCustomer(true);
    try {
      const response = await fetch(`/api/control/customers/lookup?phone=${encodeURIComponent(customerPhone)}`);
      const data = await response.json();
      if (response.ok && data.customer) {
        setCustomer({ id: data.customer.id, label: data.customer.name, subtitle: data.customer.phone, metadata: { phone: data.customer.phone } });
        setCustomerName(data.customer.name ?? "");
        setCustomerFound(true);
        return;
      }
      setCustomer(null);
      setCustomerFound(false);
      if (!customerName.trim()) setCustomerName("");
    } finally {
      setLookingUpCustomer(false);
    }
  }

  function useGenericCustomer() {
    setCustomer(null);
    setCustomerPhone("");
    setCustomerName("");
    setCustomerFound(null);
  }

  async function submit(mode: "save" | "ticket") {
    if (saving) return;
    if (!selectedBranchId || selectedBranchId === "all") return showError("Selecciona sede", "Admin debe seleccionar una sede para vender.");
    if (cart.length === 0) return showError("Carrito vacio", "Agrega al menos un producto.");
    if (customerName.trim() && !customerPhone.trim() && !customer) return showError("Cliente incompleto", "Para crear cliente ingresa celular o usa cliente generico.");
    setSaving(mode);
    try {
      const payments = paymentMethod === "mixto"
        ? splits
        : [{ method: paymentMethod, amount: subtotal, reference: "" }];
      const response = await fetch("/api/control/service-orders/product-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selectedBranchId,
          customer: customer ? { id: customer.id } : { name: customerName.trim(), phone: customerPhone.trim() },
          barberId: barber?.id ?? null,
          items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          payments,
          notes
        })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo registrar venta", data.error ?? "Intenta nuevamente.");
      await showSuccess("Venta registrada", data.message ?? "Venta registrada correctamente");
      router.push(mode === "ticket" ? data.ticketUrl : `/app/control/atenciones/${data.orderId}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="grid min-w-0 gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Atenciones</p>
          <h1 className="text-2xl font-semibold">Venta rapida de productos</h1>
          <p className="text-sm text-[var(--control-muted)]">Venta pagada al momento, con stock, caja y ticket.</p>
        </div>
        <Link className="rounded-xl border border-[var(--control-border)] px-4 py-2" href="/app/control/atenciones">Volver a Atenciones</Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Sede">
              {role === "admin" ? (
                <select className="control-input" value={branchId} onChange={(event) => { setBranchId(event.target.value); setCart([]); setProduct(null); setBarber(null); }}>
                  <option value="all">Seleccionar sede</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              ) : <p className="text-sm text-[var(--control-muted)]">Usando sede asignada.</p>}
            </Panel>

            <Panel title="Barbero opcional">
              <SearchCombobox disabled={!selectedBranchId || selectedBranchId === "all"} label="Buscar barbero" placeholder="Buscar barbero por nombre o apodo" endpoint="/api/control/search/barbers" value={barber} onSelect={setBarber} extraParams={{ branch_id: selectedBranchId }} />
              <button className="mt-3 rounded-xl border border-[var(--control-border)] px-3 py-2 text-sm" onClick={() => setBarber(null)}>Sin barbero</button>
            </Panel>
          </div>

          <Panel title="Cliente opcional">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <input
                className="control-input min-w-0"
                maxLength={9}
                placeholder="Celular de 9 digitos"
                value={customer?.metadata?.phone ?? customerPhone}
                onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), void lookupCustomer())}
                onChange={(event) => {
                  const phone = event.target.value.replace(/\D/g, "");
                  setCustomer(null);
                  setCustomerPhone(phone);
                  setCustomerName("");
                  setCustomerFound(null);
                }}
              />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--control-border)] px-4 py-2 disabled:opacity-60" disabled={lookingUpCustomer || Boolean(customer)} onClick={lookupCustomer}>
                {lookingUpCustomer ? <Loader2 size={15} className="animate-spin" /> : null}
                Buscar
              </button>
              <input
                className="control-input min-w-0"
                disabled={lookingUpCustomer || customerFound === true}
                placeholder="Nombre"
                value={customer?.label ?? customerName}
                onChange={(event) => {
                  setCustomer(null);
                  setCustomerName(event.target.value);
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="rounded-xl border border-[var(--control-border)] px-3 py-2 text-sm" onClick={useGenericCustomer}>Usar cliente generico</button>
              {customerFound === true ? <span className="rounded-full border border-green-400/40 px-3 py-1 text-xs text-green-200">Cliente encontrado</span> : null}
              {customerFound === false ? <span className="rounded-full border border-amber-400/40 px-3 py-1 text-xs text-amber-100">Cliente nuevo: se creara al vender</span> : null}
            </div>
          </Panel>

          <Panel title="Buscar producto">
            <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
              <SearchCombobox disabled={!selectedBranchId || selectedBranchId === "all"} label="Producto" placeholder="Buscar producto por nombre, SKU o categoria" endpoint="/api/control/search/products" value={product} onSelect={setProduct} extraParams={{ branch_id: selectedBranchId }} />
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--control-primary)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={!product} onClick={addProduct}><Plus size={16} /> Agregar</button>
            </div>
          </Panel>

          <Panel title="Carrito">
            <div className="grid gap-2">
              {cart.map((item) => (
                <div key={item.product.id} className="grid gap-2 rounded-xl border border-[var(--control-border)] p-3 md:grid-cols-[1fr_110px_110px_90px_auto] md:items-center">
                  <div><p className="font-semibold">{item.product.label}</p><p className="text-xs text-[var(--control-muted)]">{item.product.subtitle}</p></div>
                  <input className="control-input" type="number" min={1} max={Number(item.product.metadata?.stock ?? 1)} value={item.quantity} onChange={(event) => updateQuantity(item.product.id, Number(event.target.value))} />
                  <p>{money(price(item.product))}</p>
                  <p>{money(price(item.product) * item.quantity)}</p>
                  <button className="rounded-lg border border-red-400/40 p-2 text-red-200" onClick={() => setCart((current) => current.filter((row) => row.product.id !== item.product.id))}><Trash2 size={16} /></button>
                </div>
              ))}
              {cart.length === 0 ? <p className="text-sm text-[var(--control-muted)]">Agrega productos para vender.</p> : null}
            </div>
          </Panel>
        </div>

        <aside className="grid h-max gap-4 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4">
          <h2 className="font-semibold">Resumen y pago</h2>
          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Descuento recurrente" value="Se calcula al registrar" />
          <Row label="Total estimado" value={money(subtotal)} strong />
          <Row label="Incentivo estimado" value={money(estimatedIncentive)} />
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">El precio final usa catalogo, descuento recurrente y stock actuales del servidor.</p>
          <PaymentSplitEditor total={subtotal} method={paymentMethod} splits={splits} onMethodChange={setPaymentMethod} onSplitsChange={setSplits} />
          <textarea className="control-input" placeholder="Notas" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--control-border)] px-4 py-3 disabled:opacity-60" disabled={Boolean(saving)} onClick={() => submit("save")}>{saving === "save" ? <Loader2 size={16} className="animate-spin" /> : null} Registrar venta</button>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--control-primary)] px-4 py-3 font-semibold text-black disabled:opacity-60" disabled={Boolean(saving)} onClick={() => submit("ticket")}>{saving === "ticket" ? <Loader2 size={16} className="animate-spin" /> : null} Registrar e imprimir ticket</button>
        </aside>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4"><h2 className="font-semibold">{title}</h2><div className="mt-3">{children}</div></section>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-[var(--control-muted)]">{label}</span><span className={strong ? "font-semibold text-[var(--control-primary)]" : ""}>{value}</span></div>;
}

function price(item: SearchComboboxItem) {
  return Number(item.metadata?.salePrice ?? 0);
}

function money(value: number) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}
