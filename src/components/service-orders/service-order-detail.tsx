"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Plus, Trash2 } from "lucide-react";
import { PaymentSplitEditor } from "./payment-split-editor";
import { PaymentMethodBadge } from "./payment-method-badge";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import type { PaymentMethod, PaymentSplit } from "@/lib/service-orders/types";
import type { BarberOption } from "@/lib/reservations/types";

type Order = Record<string, any>;
type Product = { id: string; name: string; sku: string; sale_price: number; branch_id: string | null; counts_for_seller_credit?: boolean; seller_credit_amount?: number; product_branch_stock?: { branch_id: string; stock_current: number }[] };

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function ServiceOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellerType, setSellerType] = useState<"reception" | "barber">("reception");
  const [soldByEmployeeId, setSoldByEmployeeId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [splits, setSplits] = useState<PaymentSplit[]>([]);

  async function load() {
    const response = await fetch(`/api/control/service-orders/${id}`);
    const data = await response.json();
    if (!response.ok) {
      await showError("No se pudo cargar atención", data.error ?? "Intenta nuevamente.");
      return;
    }
    setOrder(data.serviceOrder);
    const branch = first(data.serviceOrder.branches);
    const [productsResponse, optionsResponse] = await Promise.all([
      fetch(`/api/control/products?branch_id=${branch?.id ?? "all"}`),
      fetch("/api/public/reservation-options")
    ]);
    const productsData = await productsResponse.json();
    const optionsData = await optionsResponse.json();
    setProducts(productsData.products ?? []);
    setBarbers((optionsData.barbers ?? []).filter((item: BarberOption) => !branch?.id || item.branchId === branch.id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const customer = first(order?.customers);
  const branch = first(order?.branches);
  const barber = first(order?.employees);
  const service = first(order?.services);
  const reservation = first(order?.reservations);
  const rewards = first(customer?.customer_reward_accounts);
  const items = order?.service_order_items ?? [];
  const payments = order?.payment_details ?? [];
  const locked = order?.status === "pagado" || order?.status === "anulado";

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [productId, products]);
  const selectedProductCredit = Boolean(selectedProduct?.counts_for_seller_credit);

  async function addExtra() {
    const response = await fetch(`/api/control/service-orders/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType: "manual_extra", name: extraName, amount: Number(extraAmount) })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo agregar adicional", data.error ?? "Revisa el monto.");
    setExtraName("");
    setExtraAmount("");
    await load();
  }

  async function addProduct() {
    const response = await fetch(`/api/control/service-orders/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemType: "product",
        productId,
        quantity: Number(quantity),
        unitPrice: selectedProduct?.sale_price,
        sellerType,
        soldByEmployeeId: sellerType === "barber" ? soldByEmployeeId : null
      })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo agregar producto", data.error ?? "Revisa stock.");
    setProductId("");
    setQuantity("1");
    setSellerType("reception");
    setSoldByEmployeeId("");
    await load();
  }

  async function deleteItem(itemId: string) {
    if (!(await showConfirm("Eliminar item", "Solo se permite antes de pagar la atención."))) return;
    const response = await fetch(`/api/control/service-orders/${id}/items/${itemId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo eliminar", data.error ?? "Intenta nuevamente.");
    await load();
  }

  async function pay() {
    const total = Number(order?.total ?? 0);
    const body = paymentMethod === "mixto"
      ? { method: paymentMethod, splits }
      : { method: paymentMethod, splits: [{ method: paymentMethod, amount: total, reference: "" }] };
    const response = await fetch(`/api/control/service-orders/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo registrar pago", data.error ?? "Revisa los montos.");
    await load();
    await showSuccess("Atención pagada");
  }

  async function voidOrder() {
    if (!(await showConfirm("Anular atención", "La atención quedará anulada y auditada."))) return;
    const response = await fetch(`/api/control/service-orders/${id}/void`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo anular", data.error ?? "Intenta nuevamente.");
    await load();
  }

  async function redeem(rewardType: "classic_cut" | "voucher_30") {
    const response = await fetch(`/api/control/service-orders/${id}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardType })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo canjear", data.error ?? "Sin recompensa disponible.");
    await load();
    await showSuccess("Recompensa aplicada", `Descuento: S/ ${Number(data.discount ?? 0).toFixed(2)}`);
  }

  if (!order) {
    return <p className="text-sm text-[var(--text-muted)]">Cargando atención...</p>;
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Atención</p>
              <h1 className="mt-2 text-2xl font-semibold">{customer?.full_name ?? "Cliente"}</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{customer?.phone ?? "Sin celular"} - {branch?.name ?? "Sede"} - {barber ? `${barber.first_name} ${barber.last_name}` : "Sin barbero"}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Origen: {order.origin === "reservation" ? "Reserva" : "Atención directa"} - Estado: {order.status}</p>
              {reservation ? <p className="mt-1 text-sm text-[var(--text-muted)]">Reserva original: {new Date(reservation.starts_at).toLocaleString("es-PE")}</p> : null}
            </div>
            <Link className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href="/app/control/atenciones">Volver</Link>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
          <h2 className="font-semibold">Items</h2>
          <div className="mt-3 grid gap-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{item.name ?? item.description}</p>
                  <p className="text-sm text-[var(--text-muted)]">{item.item_type} - Cantidad {Number(item.quantity ?? 1)}</p>
                  {item.item_type === "service" || item.item_type === "custom_service" || item.item_type === "manual_extra" ? (
                    <p className="mt-1 text-xs text-[var(--gold-soft)]">{productionEstimate(item)}</p>
                  ) : null}
                  {item.item_type === "product" && item.counts_for_seller_credit ? (
                    <p className="mt-1 text-xs text-[var(--gold-soft)]">Credito vendedor: S/ {(Number(item.quantity ?? 1) * Number(item.seller_credit_amount ?? 0)).toFixed(2)}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <strong>S/ {Number(item.subtotal ?? item.amount ?? 0).toFixed(2)}</strong>
                  {!locked ? <button className="rounded-lg border border-[var(--border-soft)] p-2 text-red-200" onClick={() => deleteItem(item.id)}><Trash2 size={15} /></button> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!locked ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Agregar adicional</h2>
              <div className="mt-3 grid gap-2">
                <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Nombre" value={extraName} onChange={(event) => setExtraName(event.target.value)} />
                <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="number" placeholder="Monto" value={extraAmount} onChange={(event) => setExtraAmount(event.target.value)} />
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={addExtra}><Plus size={16} /> Agregar</button>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Agregar producto</h2>
              <div className="mt-3 grid gap-2">
                <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={productId} onChange={(event) => setProductId(event.target.value)}>
                  <option value="">Seleccionar producto</option>
                  {products.map((product) => {
                    const stock = product.product_branch_stock?.find((item) => item.branch_id === branch?.id)?.stock_current ?? 0;
                    return <option key={product.id} value={product.id}>{product.name} - S/ {Number(product.sale_price).toFixed(2)} - stock {stock}</option>;
                  })}
                </select>
                <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <label className="text-sm text-[var(--text-muted)]">Quien vendio este producto?
                  <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={sellerType} onChange={(event) => setSellerType(event.target.value as "reception" | "barber")}>
                    <option value="reception">Recepcion</option>
                    <option value="barber">Barbero especifico</option>
                  </select>
                </label>
                {sellerType === "barber" ? (
                  <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={soldByEmployeeId} onChange={(event) => setSoldByEmployeeId(event.target.value)}>
                    <option value="">Seleccionar barbero</option>
                    {barbers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                ) : null}
                {selectedProductCredit ? <p className="rounded-lg border border-[var(--gold-soft)] px-3 py-2 text-xs text-[var(--gold-soft)]">Este producto suma S/ {Number(selectedProduct?.seller_credit_amount ?? 2).toFixed(2)} por unidad al vendedor.</p> : null}
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={addProduct}><Plus size={16} /> Agregar</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="grid h-max gap-4 rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
        <div>
          <h2 className="font-semibold">Resumen</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <Row label="Subtotal" value={`S/ ${Number(order.subtotal ?? 0).toFixed(2)}`} />
            <Row label="Descuentos" value={`S/ ${Number(order.discount_amount ?? 0).toFixed(2)}`} />
            <Row label="Total" value={`S/ ${Number(order.total ?? 0).toFixed(2)}`} strong />
            <Row label="Pagado" value={`S/ ${Number(order.total_paid ?? 0).toFixed(2)}`} />
            <Row label="Saldo" value={`S/ ${Number(order.balance ?? order.total ?? 0).toFixed(2)}`} strong />
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm text-[var(--text-muted)]">Pagos</p>
          {payments.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Sin pagos registrados.</p> : null}
          {payments.map((payment: any) => (
            <div key={payment.id} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm">
              <PaymentMethodBadge method={payment.method} />
              <span>S/ {Number(payment.amount).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {!locked ? (
          <>
            <div className="grid gap-2">
              <p className="text-sm text-[var(--text-muted)]">Recompensas disponibles: {rewards?.available_rewards ?? 0}</p>
              {Number(rewards?.available_rewards ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => redeem("classic_cut")}>Corte gratis</button>
                  <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => redeem("voucher_30")}>Vale S/30</button>
                </div>
              ) : null}
            </div>
            <PaymentSplitEditor total={Number(order.total ?? 0)} method={paymentMethod} splits={splits} onMethodChange={setPaymentMethod} onSplitsChange={setSplits} />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black" onClick={pay}><BadgeCheck size={16} /> Registrar pago</button>
          </>
        ) : null}

        {order.status !== "anulado" ? <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-red-200" onClick={voidOrder}>Anular atención</button> : null}
      </aside>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={strong ? "font-semibold text-[var(--gold)]" : ""}>{value}</span>
    </div>
  );
}

function productionEstimate(item: any) {
  const gross = Number(item.subtotal ?? item.amount ?? 0);
  const deduction = Math.min(gross > 60 ? 10 : 2, gross);
  const production = Math.max(gross - deduction, 0);
  return `Produccion estimada: S/ ${gross.toFixed(2)} - S/ ${deduction.toFixed(2)} = S/ ${production.toFixed(2)}`;
}
