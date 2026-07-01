"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { PaymentSplitEditor } from "./payment-split-editor";
import { PaymentMethodBadge } from "./payment-method-badge";
import { showConfirm, showError, showSuccess, showTextPrompt } from "@/lib/ui/swal";
import type { PaymentMethod, PaymentSplit } from "@/lib/service-orders/types";
import type { BarberOption, ServiceOption } from "@/lib/reservations/types";
import { isGenericCustomerPhone } from "@/lib/customers/is-generic-customer";
import { formatPeruDateTime } from "@/lib/datetime/peru-time";

type Order = Record<string, any>;
type Product = { id: string; name: string; sku: string; sale_price: number; branch_id: string | null; category?: string | null; counts_for_seller_credit?: boolean; seller_credit_amount?: number; product_branch_stock?: { branch_id: string; stock_current: number }[] };

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function ServiceOrderDetail({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const paymentRef = useRef<HTMLElement | null>(null);
  const [highlightPayment, setHighlightPayment] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellerType, setSellerType] = useState<"reception" | "barber">("reception");
  const [soldByEmployeeId, setSoldByEmployeeId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [responsibleBarberId, setResponsibleBarberId] = useState("");
  const [barberChangeReason, setBarberChangeReason] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/control/service-orders/${id}`);
    const data = await response.json();
    if (!response.ok) {
      await showError("No se pudo cargar atenciÃ³n", data.error ?? "Intenta nuevamente.");
      return;
    }
    setOrder(data.serviceOrder);
    const currentBarber = first(data.serviceOrder.employees);
    setResponsibleBarberId(currentBarber?.id ?? "");
    const branch = first(data.serviceOrder.branches);
    const [productsResponse, optionsResponse] = await Promise.all([
      fetch(`/api/control/products?branch_id=${branch?.id ?? "all"}`),
      fetch("/api/public/reservation-options")
    ]);
    const productsData = await productsResponse.json();
    const optionsData = await optionsResponse.json();
    setProducts(productsData.products ?? []);
    setBarbers((optionsData.barbers ?? []).filter((item: BarberOption) => !branch?.id || item.branchId === branch.id));
    setServices((optionsData.services ?? []).filter((item: ServiceOption) => !branch?.id || !item.branchId || item.branchId === branch.id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (searchParams.get("focus") !== "payment" || !order) return;
    paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightPayment(true);
    const timer = window.setTimeout(() => setHighlightPayment(false), 2500);
    return () => window.clearTimeout(timer);
  }, [order, searchParams]);

  const customer = first(order?.customers);
  const branch = first(order?.branches);
  const barber = first(order?.employees);
  const service = first(order?.services);
  const reservation = first(order?.reservations);
  const isProductSale = order?.order_type === "product_sale";
  const rewards = first(customer?.customer_reward_accounts);
  const items = order?.service_order_items ?? [];
  const billableItems = items.filter((item: any) => ["service", "custom_service", "manual_extra", "product", "snack"].includes(item.item_type));
  const payments = order?.payment_details ?? [];
  const locked = order?.status === "pagado" || order?.status === "anulado";
  const hasClassicCut = items.some((item: any) => {
    const text = `${item.name ?? ""} ${item.description ?? ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return ["service", "custom_service"].includes(item.item_type) && text.includes("corte") && text.includes("clasico");
  });

  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [productId, products]);
  const selectedProductCredit = Boolean(selectedProduct?.counts_for_seller_credit);

  async function addService() {
    if (busyAction) return;
    setBusyAction("service");
    try {
      const response = await fetch(`/api/control/service-orders/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType: "service", serviceId })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo agregar servicio", data.error ?? "Selecciona un servicio.");
      setServiceId("");
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  async function addProduct() {
    if (busyAction) return;
    setBusyAction("product");
    try {
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
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (busyAction) return;
    if (!(await showConfirm("Eliminar item", "Solo se permite antes de pagar la atenciÃ³n."))) return;
    setBusyAction(`delete-${itemId}`);
    try {
      const response = await fetch(`/api/control/service-orders/${id}/items/${itemId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo eliminar", data.error ?? "Intenta nuevamente.");
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  async function pay() {
    if (busyAction) return;
    setBusyAction("pay");
    try {
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
      await showSuccess("AtenciÃ³n pagada");
    } finally {
      setBusyAction(null);
    }
  }

  async function voidOrder() {
    if (busyAction) return;
    const reason = isProductSale
      ? await showTextPrompt("Anular venta de productos", "El motivo es obligatorio y quedara auditado.")
      : (await showConfirm("Anular atenciÃ³n", "La atenciÃ³n quedarÃ¡ anulada y auditada.")) ? "Atencion anulada" : null;
    if (!reason) return;
    setBusyAction("void");
    try {
      const response = await fetch(`/api/control/service-orders/${id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo anular", data.error ?? "Intenta nuevamente.");
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  async function sendThankYou() {
    if (busyAction) return;
    setBusyAction("thank-you");
    try {
      const response = await fetch(`/api/control/service-orders/${id}/thank-you-whatsapp`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo generar WhatsApp", data.error ?? "Revisa el celular del cliente.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusyAction(null);
    }
  }

  async function changeBarber() {
    if (busyAction || !responsibleBarberId || responsibleBarberId === barber?.id) return;
    if (!(await showConfirm("Cambiar barbero responsable", "La atencion y sus items de servicio se reasignaran al nuevo barbero."))) return;
    setBusyAction("change-barber");
    try {
      const response = await fetch(`/api/control/service-orders/${id}/barber`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: responsibleBarberId, reason: barberChangeReason })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo cambiar el barbero", data.error ?? "Intenta nuevamente.");
      setBarberChangeReason("");
      await load();
      await showSuccess("Barbero actualizado");
    } finally {
      setBusyAction(null);
    }
  }

  async function redeem() {
    if (busyAction) return;
    setBusyAction("classic_cut");
    try {
      const response = await fetch(`/api/control/service-orders/${id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardType: "classic_cut_free" })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo canjear", data.error ?? "Sin recompensa disponible.");
      await load();
      await showSuccess("Recompensa aplicada", `Descuento: S/ ${Number(data.discount ?? 0).toFixed(2)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function removeReward() {
    if (busyAction) return;
    setBusyAction("remove-reward");
    try {
      const response = await fetch("/api/control/rewards/remove", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceOrderId: id })
      });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo quitar reward", data.error);
      await load();
      await showSuccess("Reward liberado");
    } finally {
      setBusyAction(null);
    }
  }

  if (!order) {
    return <p className="text-sm text-[var(--text-muted)]">Cargando atenciÃ³n...</p>;
  }

  const canThank = Boolean(customer?.phone) && !isGenericCustomerPhone(customer?.phone) && order.status !== "anulado";

  return (
    <section className="grid min-w-0 max-w-full gap-5 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid min-w-0 gap-4">
        <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">{isProductSale ? "Venta de productos" : "Atención"}</p>
              <h1 className="mt-2 text-2xl font-semibold">{isGenericCustomerPhone(customer?.phone) ? "Cliente generico" : customer?.full_name ?? "Cliente"}</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{customer?.phone ?? "Sin celular"} - {branch?.name ?? "Sede"} - {barber ? `${barber.first_name} ${barber.last_name}` : "Sin barbero"}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Tipo: {isProductSale ? "Venta de productos" : "Atención"} - Origen: {order.origin === "reservation" ? "Reserva" : "Atención directa"} - Estado: {order.status}</p>
              {reservation ? <p className="mt-1 text-sm text-[var(--text-muted)]">Reserva original: {new Date(reservation.starts_at).toLocaleString("es-PE")}</p> : null}
              <p className="mt-1 text-sm text-[var(--text-muted)]">Creada: {formatPeruDateTime(order.created_at)} - Atendida: {formatPeruDateTime(order.attended_at)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canThank ? (
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-400/40 px-3 py-2 text-sm text-green-200 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={sendThankYou}>
                  {busyAction === "thank-you" ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  Agradecer por WhatsApp
                </button>
              ) : null}
              <Link className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href="/app/control/atenciones">Volver</Link>
            </div>
          </div>
        </div>

        <div className="order-[6] rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
          <h2 className="font-semibold">Observaciones y auditoria</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-muted)]">{order.observations || "Sin observaciones."}</p>
          <div className="mt-4 grid gap-2">
            {(order.audit_logs ?? []).map((log: any) => <div key={log.id} className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)]"><strong className="text-white">{log.event_type}</strong> - {formatPeruDateTime(log.created_at)}</div>)}
            {(order.audit_logs ?? []).length === 0 ? <p className="text-xs text-[var(--text-muted)]">Sin eventos de auditoria vinculados.</p> : null}
          </div>
        </div>

        {order.status !== "anulado" ? (
          <div className="order-[5] rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
            <h2 className="font-semibold">Barbero responsable</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              El cambio se aplica a la atencion y a todos sus items de servicio. En atenciones pagadas solo admin puede corregirlo con motivo.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={responsibleBarberId} onChange={(event) => setResponsibleBarberId(event.target.value)}>
                <option value="">Seleccionar barbero</option>
                {barbers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input
                className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white"
                placeholder={order.status === "pagado" ? "Motivo obligatorio" : "Motivo opcional"}
                value={barberChangeReason}
                onChange={(event) => setBarberChangeReason(event.target.value)}
              />
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--gold)] px-4 py-2 text-[var(--gold-soft)] disabled:opacity-50"
                disabled={Boolean(busyAction) || !responsibleBarberId || responsibleBarberId === barber?.id || (order.status === "pagado" && !barberChangeReason.trim())}
                onClick={changeBarber}
              >
                {busyAction === "change-barber" ? <Loader2 size={16} className="animate-spin" /> : null}
                Guardar cambio
              </button>
            </div>
          </div>
        ) : null}

        <div className="order-[2] rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
          <h2 className="font-semibold">Items</h2>
          <div className="mt-3 grid gap-2">
            {items.length === 0 ? <p className="rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">Esta atenciÃ³n no tiene items registrados. Agrega al menos uno antes de cobrar.</p> : null}
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
                  {item.discount_rule === "customer_recurrent_barber_product" ? <p className="mt-1 text-xs text-green-300">Cliente recurrente: {Number(item.discount_percent)}% de descuento. Precio original S/ {Number(item.original_unit_price ?? item.unit_price).toFixed(2)}.</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <strong>S/ {Number(item.subtotal ?? item.amount ?? 0).toFixed(2)}</strong>
                  {!locked ? <button className="rounded-lg border border-[var(--border-soft)] p-2 text-red-200 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={() => deleteItem(item.id)}>{busyAction === `delete-${item.id}` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}</button> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!locked ? (
          <div className="order-[3] grid min-w-0 gap-4">
            <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Agregar servicio</h2>
              <div className="mt-3 grid gap-2">
                <select className="w-full min-w-0 max-w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                  <option value="">Seleccionar servicio</option>
                  {services.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.price == null ? "Consultar" : `S/ ${Number(item.price).toFixed(2)}`}</option>)}
                </select>
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={addService}>{busyAction === "service" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Agregar servicio</button>
              </div>
            </div>
            <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Agregar producto</h2>
              <div className="mt-3 grid gap-2">
                <select className="w-full min-w-0 max-w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={productId} onChange={(event) => setProductId(event.target.value)}>
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
                <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={addProduct}>{busyAction === "product" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Agregar</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <aside ref={paymentRef} className={`grid h-max min-w-0 max-w-full gap-4 overflow-hidden rounded-lg border bg-black/35 p-4 transition-shadow ${searchParams.get("focus") === "payment" || highlightPayment ? "border-[var(--gold)] shadow-[0_0_0_1px_rgba(212,175,55,0.35),0_0_40px_-20px_rgba(212,175,55,0.9)]" : "border-[var(--border-soft)]"}`}>
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
                hasClassicCut
                  ? <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--gold)] px-3 py-2 text-xs disabled:opacity-60" disabled={Boolean(busyAction)} onClick={redeem}>{busyAction === "classic_cut" ? <Loader2 size={14} className="animate-spin" /> : null}Aplicar corte gratis</button>
                  : <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">Reward disponible solo para Corte ClÃ¡sico.</p>
              ) : null}
              {order.reward_redemption_id ? <button className="rounded-lg border border-red-400/40 px-3 py-2 text-xs text-red-200" disabled={Boolean(busyAction)} onClick={removeReward}>Quitar reward</button> : null}
            </div>
            <PaymentSplitEditor total={Number(order.total ?? 0)} method={paymentMethod} splits={splits} onMethodChange={setPaymentMethod} onSplitsChange={setSplits} />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black disabled:opacity-60" disabled={Boolean(busyAction) || billableItems.length === 0} onClick={pay}>{busyAction === "pay" ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} Registrar pago</button>
            <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={load}>Guardar cambios</button>
          </>
        ) : null}

        {order.status === "pagado" ? (
          <div className="grid gap-2">
            <Link className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-center" href={`/app/control/atenciones/${id}/ticket`}>Ver ticket</Link>
            <Link className="rounded-lg bg-[var(--gold)] px-4 py-2 text-center font-semibold text-black" href={`/app/control/atenciones/${id}/ticket`}>Imprimir / WhatsApp</Link>
            {canThank ? <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-400/40 px-4 py-2 text-green-200 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={sendThankYou}>{busyAction === "thank-you" ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Agradecer al cliente</button> : null}
          </div>
        ) : null}

        {order.status !== "anulado" ? <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] px-4 py-2 text-red-200 disabled:opacity-60" disabled={Boolean(busyAction)} onClick={voidOrder}>{busyAction === "void" ? <Loader2 size={16} className="animate-spin" /> : null}{isProductSale ? "Anular venta" : "Anular atención"}</button> : null}
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
