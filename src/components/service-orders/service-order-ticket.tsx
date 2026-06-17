"use client";

import Link from "next/link";
import { Loader2, Printer, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { showError } from "@/lib/ui/swal";

type Ticket = Record<string, any>;

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function ServiceOrderTicket({ id }: { id: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch(`/api/control/service-orders/${id}/ticket`);
      const data = await response.json();
      setLoading(false);
      if (!response.ok) {
        await showError("No se pudo generar ticket", data.error ?? "Intenta nuevamente.");
        return;
      }
      setTicket(data.ticket);
    }
    load();
  }, [id]);

  const branch = first(ticket?.branches);
  const customer = first(ticket?.customers);
  const barber = first(ticket?.employees);
  const items = ticket?.service_order_items ?? [];
  const payments = ticket?.payment_details ?? [];
  const whatsappUrl = useMemo(() => {
    const phone = String(customer?.phone ?? "").replace(/\D/g, "");
    const message = encodeURIComponent(`La Bajadita Barber Shop\nTicket atencion ${id}\nTotal S/ ${Number(ticket?.total ?? 0).toFixed(2)}`);
    return phone ? `https://wa.me/51${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  }, [customer?.phone, id, ticket?.total]);

  if (loading) return <p className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 size={16} className="animate-spin" /> Generando ticket...</p>;
  if (!ticket) return <p className="text-sm text-[var(--text-muted)]">Ticket no disponible.</p>;

  return (
    <section className="mx-auto grid max-w-3xl gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={`/app/control/atenciones/${id}`}>Volver</Link>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black" onClick={() => window.print()}><Printer size={16} /> Imprimir ticket</button>
          <a className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => setSending(true)}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar por WhatsApp</a>
        </div>
      </div>

      <div className="mx-auto w-[80mm] rounded-lg bg-white p-4 font-mono text-[11px] text-black print:w-[80mm] print:rounded-none">
        <div className="text-center">
          <p className="text-sm font-bold">LA BAJADITA BARBER SHOP</p>
          <p>{branch?.name ?? "Sede"}</p>
          <p>{branch?.address ?? ""}</p>
          <p>{branch?.phone ?? ""}</p>
        </div>
        <div className="my-3 border-t border-dashed border-black" />
        <p>Fecha: {new Date(ticket.paid_at ?? ticket.created_at).toLocaleString("es-PE")}</p>
        <p>Cliente: {customer?.full_name ?? "Cliente"}</p>
        <p>Barbero: {barber ? `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim() : "Sin barbero"}</p>
        <p>Ticket: {ticket.id}</p>
        <div className="my-3 border-t border-dashed border-black" />
        {items.map((item: any) => (
          <div key={item.id} className="mb-2">
            <div className="flex justify-between gap-2">
              <span>{item.name ?? item.description}</span>
              <span>S/ {Number(item.subtotal ?? item.amount ?? 0).toFixed(2)}</span>
            </div>
            <p>{Number(item.quantity ?? 1)} x S/ {Number(item.unit_price ?? item.amount ?? 0).toFixed(2)}</p>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-black" />
        <Row label="Subtotal" value={ticket.subtotal} />
        <Row label="Descuentos/reward" value={ticket.discount_amount} />
        <Row label="Total" value={ticket.total} strong />
        <Row label="Pagado" value={ticket.total_paid} />
        <div className="my-3 border-t border-dashed border-black" />
        <p className="font-bold">Pagos</p>
        {payments.length === 0 ? <p>Atencion cubierta por reward.</p> : payments.map((payment: any) => <Row key={payment.id} label={payment.method} value={payment.amount} />)}
        <div className="my-3 border-t border-dashed border-black" />
        <p className="text-center">Gracias por tu visita</p>
        <p className="text-center">Ticket interno, no SUNAT</p>
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: unknown; strong?: boolean }) {
  return <div className={`flex justify-between gap-2 ${strong ? "text-sm font-bold" : ""}`}><span>{label}</span><span>S/ {Number(value ?? 0).toFixed(2)}</span></div>;
}
