"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { showError, showWarning } from "@/lib/ui/swal";

type Order = Record<string, any>;

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function LocalAttentionDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const token = localStorage.getItem("lbbs:localToken") ?? "";
    if (!token) {
      setLoading(false);
      await showWarning("Token requerido", "Escanea el QR del dispositivo.");
      return;
    }
    const response = await fetch(`/api/local/service-orders/${id}`, { headers: { "x-local-token": token } });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar atencion", data.error ?? "Token invalido.");
    setOrder(data.serviceOrder);
  }

  const customer = first(order?.customers);
  const branch = first(order?.branches);
  const barber = first(order?.employees);
  const items = order?.service_order_items ?? [];

  return (
    <main className="min-h-screen bg-black px-4 py-6">
      <section className="mx-auto grid max-w-5xl gap-5">
        <div className="rounded-3xl border border-[var(--border-soft)] bg-black/50 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Modo local</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Atencion registrada</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Solo lectura local. Caja cobra en el panel interno.</p>
            </div>
            <Link className="rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm" href="/local/agenda">Volver a agenda</Link>
          </div>
        </div>
        {loading ? <div className="rounded-2xl border border-[var(--border-soft)] p-5 text-sm text-[var(--text-muted)]">Cargando atencion...</div> : null}
        {order ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="text-xl font-semibold">{customer?.full_name ?? "Cliente"}</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{customer?.phone ?? "Sin celular"} - {branch?.name ?? "Sede"} - {barber ? `${barber.first_name} ${barber.last_name}` : "Sin barbero"}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Estado: {order.status} - Origen: {order.origin}</p>
              <div className="mt-4 grid gap-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] bg-black/25 p-3">
                    <div>
                      <p className="font-semibold">{item.name ?? item.description}</p>
                      <p className="text-xs text-[var(--text-muted)]">{item.item_type} x {Number(item.quantity ?? 1)}</p>
                    </div>
                    <strong>S/ {Number(item.subtotal ?? 0).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <h2 className="font-semibold">Resumen</h2>
              <Row label="Subtotal" value={`S/ ${Number(order.subtotal ?? 0).toFixed(2)}`} />
              <Row label="Descuentos" value={`S/ ${Number(order.discount_amount ?? 0).toFixed(2)}`} />
              <Row label="Total pendiente" value={`S/ ${Number(order.balance ?? order.total ?? 0).toFixed(2)}`} />
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="mt-3 flex items-center justify-between text-sm"><span className="text-[var(--text-muted)]">{label}</span><strong className="text-[var(--gold)]">{value}</strong></div>;
}
