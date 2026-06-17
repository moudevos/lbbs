"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, MessageCircle, RefreshCw, UserRound } from "lucide-react";
import type { BarberOption, BranchOption, ReservationStatus, ReservationSummary, ServiceOption } from "@/lib/reservations/types";
import { formatDate, formatTime } from "@/lib/reservations/time";
import { showConfirm, showError, showSuccess, showWarning, swalThemed } from "@/lib/ui/swal";
import { ReservationStatusFlow } from "./reservation-status-flow";

const statuses: ReservationStatus[] = ["pendiente", "contactado", "confirmado", "atendido", "cancelado", "no_asistio"];

export function ReservationBoard({ mode }: { mode: "reservas" | "agenda" }) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("");
  const [barberId, setBarberId] = useState("");
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ role: string; branchId: string | null; branchName: string | null } | null>(null);
  const [options, setOptions] = useState<{ branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[] }>({ branches: [], services: [], barbers: [] });
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [processingReservationId, setProcessingReservationId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<ReservationSummary | null>(null);
  const [attending, setAttending] = useState<ReservationSummary | null>(null);
  const [detail, setDetail] = useState<ReservationSummary | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams(mode === "agenda" ? { from: date, to: dateTo } : { date });
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    if (status) params.set("status", status);
    if (barberId) params.set("barberId", barberId);
    const response = await fetch(`/api/control/reservations?${params}`);
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      await showError("No se pudo cargar", data.error ?? "Error desconocido");
      return;
    }

    setReservations(data.reservations ?? []);
  }

  useEffect(() => {
    load();
    loadOptions();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, dateTo, status, barberId]);

  async function loadOptions() {
    const [optionsResponse, meResponse] = await Promise.all([fetch("/api/public/reservation-options"), fetch("/api/control/me")]);
    const optionsData = await optionsResponse.json();
    const meData = await meResponse.json();
    setOptions({
      branches: optionsData.branches ?? [],
      services: optionsData.services ?? [],
      barbers: optionsData.barbers ?? []
    });
    setMe(meData.employee ?? null);
  }

  async function markAttended(reservation: ReservationSummary, barberId?: string) {
    const confirmed = await showConfirm(
      "Confirmas que el cliente fue atendido?",
      "Se cerrara la reserva y se abrira una atencion para registrar pago, adicionales o productos."
    );
    if (!confirmed) return;

    setProcessingReservationId(reservation.id);
    const response = await fetch(`/api/control/reservations/${reservation.id}/mark-attended`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId: barberId || undefined })
    });
    const data = await response.json();
    setProcessingReservationId(null);

    if (!response.ok) {
      await showError("Accion rechazada", data.error ?? "No se pudo actualizar.");
      return;
    }

    setAttending(null);
    await load();
    await showSuccess("Reserva cerrada", "Ahora registra el pago o adicionales de la atencion.");
    if (data.redirectTo) router.push(data.redirectTo);
  }

  async function changeStatus(reservation: ReservationSummary, nextStatus: ReservationStatus) {
    if (nextStatus === "atendido") {
      if (!reservation.barberId) {
        setAttending(reservation);
        return;
      }
      await markAttended(reservation);
      return;
    }

    if (["cancelado", "no_asistio", "confirmado"].includes(nextStatus)) {
      const confirmed = await showConfirm(`Cambiar a ${nextStatus}`, "Esta accion sera auditada.");
      if (!confirmed) return;
    }

    setProcessingReservationId(reservation.id);
    const response = await fetch(`/api/control/reservations/${reservation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await response.json();
    setProcessingReservationId(null);

    if (!response.ok) {
      await showError("Acción rechazada", data.error ?? "No se pudo actualizar.");
      return;
    }

    await load();
    await showSuccess("Reserva actualizada");
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{mode === "agenda" ? "Agenda" : "Reservas"}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{mode === "agenda" ? "Vista diaria por rol." : "Gestion operativa de solicitudes."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          {mode === "agenda" ? (
            <>
              <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" type="button" onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setDate(today);
                setDateTo(today);
              }}>Hoy</button>
              <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" type="button" onClick={() => {
                const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                setDate(tomorrow);
                setDateTo(tomorrow);
              }}>Mañana</button>
              <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={barberId} onChange={(event) => setBarberId(event.target.value)}>
                <option value="">Todos los barberos</option>
                {options.barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
              </select>
            </>
          ) : null}
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2" type="button" onClick={load}>
            <RefreshCw size={18} />
          </button>
          {mode === "reservas" && me?.role !== "barbero" ? (
            <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 font-semibold text-black" type="button" onClick={() => setCreateOpen(true)}>
              <CalendarCheck size={18} />
              Nueva reserva
            </button>
          ) : null}
        </div>
      </div>

      {createOpen && me ? (
        <InternalReservationModal
          me={me}
          options={options}
          saving={creating}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await load();
          }}
          onSaving={setCreating}
        />
      ) : null}
      {rescheduling ? (
        <RescheduleModal
          reservation={rescheduling}
          options={options}
          me={me}
          onClose={() => setRescheduling(null)}
          onSaved={async () => {
            setRescheduling(null);
            await load();
          }}
        />
      ) : null}
      {detail ? <ReservationDetailModal reservation={detail} onClose={() => setDetail(null)} onReschedule={() => { setRescheduling(detail); setDetail(null); }} onViewAttention={() => detail.serviceOrderId && router.push(`/app/control/atenciones/${detail.serviceOrderId}`)} /> : null}
      {attending ? (
        <AttendBarberModal
          reservation={attending}
          options={options}
          busy={processingReservationId === attending.id}
          onClose={() => setAttending(null)}
          onConfirm={(selectedBarberId) => markAttended(attending, selectedBarberId)}
        />
      ) : null}

      <div className="grid gap-3">
        {loading ? <p className="text-sm text-[var(--text-muted)]">Cargando...</p> : null}
        {!loading && reservations.length === 0 ? <p className="rounded-lg border border-[var(--border-soft)] p-4 text-sm text-[var(--text-muted)]">No hay reservas para los filtros seleccionados.</p> : null}
        {reservations.map((reservation) => (
          <article key={reservation.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--gold-soft)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">{formatDate(reservation.startsAt)} - {formatTime(reservation.startsAt)} a {formatTime(reservation.endsAt)}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{reservation.customer}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{reservation.service} - {reservation.branch} - Barbero: {reservation.barber ?? "Por asignar"}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Celular: {reservation.customerPhone || "No registrado"} - Precio: {reservation.price == null ? "Por confirmar" : `S/ ${reservation.price}`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" type="button" onClick={async () => {
                  if (reservation.whatsappTemplateMissing || !reservation.whatsappUrl) {
                    await showWarning("No hay plantilla configurada para este estado.", reservation.whatsappTemplateMissing ? `Falta plantilla: ${reservation.whatsappTemplateMissing}` : "");
                    return;
                  }
                  await fetch(`/api/control/reservations/${reservation.id}/whatsapp-link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: reservation.status }) });
                  window.open(reservation.whatsappUrl, "_blank", "noopener,noreferrer");
                }}>
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" type="button" onClick={() => setDetail(reservation)}>Detalle</button>
                <ReservationStatusFlow
                  status={reservation.status}
                  serviceOrderId={reservation.serviceOrderId}
                  busy={processingReservationId === reservation.id}
                  onChange={(next) => changeStatus(reservation, next)}
                  onReschedule={() => setRescheduling(reservation)}
                  onViewAttention={() => reservation.serviceOrderId && router.push(`/app/control/atenciones/${reservation.serviceOrderId}`)}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type InternalReservationForm = {
  branchId: string;
  customerPhone: string;
  customerName: string;
  serviceId: string;
  customServiceName: string;
  employeeId: string;
  date: string;
  time: string;
  price: string;
  observations: string;
  status: ReservationStatus;
};

function InternalReservationModal({
  me,
  options,
  saving,
  onClose,
  onCreated,
  onSaving
}: {
  me: { role: string; branchId: string | null; branchName: string | null };
  options: { branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[] };
  saving: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onSaving: (saving: boolean) => void;
}) {
  const initialBranch = me.role === "recepcion" ? me.branchId ?? "" : localStorage.getItem("lbbs:branchScope") !== "all" ? localStorage.getItem("lbbs:branchScope") ?? "" : "";
  const [form, setForm] = useState<InternalReservationForm>({
    branchId: initialBranch,
    customerPhone: "",
    customerName: "",
    serviceId: "",
    customServiceName: "",
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    price: "",
    observations: "",
    status: "pendiente"
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [customerLookup, setCustomerLookup] = useState<{ found: boolean; name?: string; totalVisits?: number; availableRewards?: number } | null>(null);
  const selectedService = options.services.find((service) => service.id === form.serviceId);
  const isCustom = selectedService?.sku === "CUSTOM" || Boolean(form.customServiceName.trim());
  const branchServices = options.services.filter((service) => !form.branchId || !service.branchId || service.branchId === form.branchId);
  const branchBarbers = options.barbers.filter((barber) => !form.branchId || barber.branchId === form.branchId);

  useEffect(() => {
    async function loadSlots() {
      if (!form.branchId || !form.serviceId || !form.date) {
        setSlots([]);
        return;
      }
      const params = new URLSearchParams({ branchId: form.branchId, serviceId: form.serviceId, date: form.date });
      if (form.employeeId) params.set("employeeId", form.employeeId);
      const response = await fetch(`/api/public/availability?${params}`);
      const data = await response.json();
      setSlots(response.ok ? data.slots ?? [] : []);
    }
    loadSlots();
  }, [form.branchId, form.serviceId, form.employeeId, form.date]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.status === "confirmado" && isCustom && !form.price) {
      await swalThemed.fire("Precio requerido", "No se puede confirmar un servicio personalizado sin precio.", "warning");
      return;
    }
    onSaving(true);
    const response = await fetch("/api/control/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        employeeId: form.employeeId || null,
        price: form.price ? Number(form.price) : null
      })
    });
    const data = await response.json();
    onSaving(false);
    if (!response.ok) {
      await swalThemed.fire("No se pudo crear", data.error ?? "Error desconocido", "error");
      return;
    }
    if (data.customerNameDiffers) {
      const confirmed = await swalThemed.fire({
        title: "Cliente encontrado. ¿Deseas usar este cliente?",
        text: data.customer?.full_name ? `Se usara: ${data.customer.full_name}` : "El celular ya pertenece a un cliente registrado.",
        icon: "question",
        confirmButtonText: "Usar cliente",
        showCancelButton: false
      });
      if (!confirmed.isConfirmed) return;
    }
    await swalThemed.fire(data.overlapWarning ? "Reserva creada con advertencia" : "Reserva creada", data.overlapWarning ? "Existe una reserva pendiente/contactada solapada para el barbero." : "", data.overlapWarning ? "warning" : "success");
    await onCreated();
  }

  async function lookupCustomer(phone: string) {
    if (phone.trim().length < 6) {
      setCustomerLookup(null);
      return;
    }
    const response = await fetch(`/api/control/customers/lookup?phone=${encodeURIComponent(phone)}`);
    const data = await response.json();
    if (!response.ok) return;
    if (data.found) {
      setCustomerLookup({
        found: true,
        name: data.customer.name,
        totalVisits: data.customer.totalVisits,
        availableRewards: data.customer.availableRewards
      });
      setForm((current) => ({ ...current, customerName: data.customer.name ?? current.customerName }));
    } else {
      setCustomerLookup({ found: false });
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Recepcion interna</p>
            <h2 className="mt-2 text-2xl font-semibold">Nueva reserva</h2>
          </div>
          <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={onClose}>Cerrar</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[var(--text-muted)]">Sede
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.branchId} disabled={me.role === "recepcion"} onChange={(e) => setForm({ ...form, branchId: e.target.value, employeeId: "", serviceId: "", time: "" })}>
              <option value="">Selecciona una sede</option>
              {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[var(--text-muted)]">Estado inicial
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })}>
              <option value="pendiente">pendiente</option>
              <option value="contactado">contactado</option>
              <option value="confirmado">confirmado</option>
            </select>
          </label>
          <label className="text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-2"><UserRound size={16} />Celular del cliente</span>
            <div className="mt-2 flex gap-2">
              <input className="min-w-0 flex-1 rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.customerPhone} onChange={(e) => { setForm({ ...form, customerPhone: e.target.value }); setCustomerLookup(null); }} />
              <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => lookupCustomer(form.customerPhone)}>Buscar</button>
            </div>
            {customerLookup?.found ? <span className="mt-2 inline-flex rounded-md border border-green-400/40 px-2 py-1 text-xs text-green-200">Cliente encontrado - {customerLookup.totalVisits ?? 0} atenciones - {customerLookup.availableRewards ?? 0} rewards</span> : null}
            {customerLookup?.found === false ? <span className="mt-2 inline-flex rounded-md border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--text-muted)]">Cliente no encontrado. Se creará al guardar la reserva.</span> : null}
          </label>
          <Field label="Nombre del cliente" value={form.customerName} onChange={(value) => setForm({ ...form, customerName: value })} />
          <label className="text-sm text-[var(--text-muted)]">Servicio
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value, time: "" })}>
              <option value="">Selecciona servicio</option>
              {branchServices.map((service) => <option key={service.id} value={service.id}>{service.name} - {service.price == null ? "Por confirmar" : `S/ ${service.price}`}</option>)}
            </select>
          </label>
          <Field label="Servicio personalizado" value={form.customServiceName} onChange={(value) => setForm({ ...form, customServiceName: value })} />
          <label className="text-sm text-[var(--text-muted)]">Barbero opcional
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value, time: "" })}>
              <option value="">Sin asignar</option>
              {branchBarbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
            </select>
            <span className="mt-2 block text-xs text-[var(--text-muted)]">Puedes asignar el barbero ahora o al confirmar la atencion.</span>
          </label>
          <Field label="Fecha" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value, time: "" })} />
          <label className="text-sm text-[var(--text-muted)]">Hora disponible
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
              <option value="">Selecciona hora</option>
              {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
          <Field label="Precio personalizado" type="number" value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
          <label className="text-sm text-[var(--text-muted)] md:col-span-2">Observaciones
            <textarea className="mt-2 min-h-24 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </label>
        </div>
        <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black disabled:opacity-60">
          <CalendarCheck size={18} />
          {saving ? "Creando..." : "Crear reserva"}
        </button>
      </form>
    </div>
  );
}

function AttendBarberModal({
  reservation,
  options,
  busy,
  onClose,
  onConfirm
}: {
  reservation: ReservationSummary;
  options: { branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[] };
  busy: boolean;
  onClose: () => void;
  onConfirm: (barberId: string) => Promise<void>;
}) {
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const branchBarbers = options.barbers.filter((barber) => barber.branchId === reservation.branchId);
  const reservationDate = reservation.startsAt.slice(0, 10);
  const reservationTime = formatTime(reservation.startsAt);

  useEffect(() => {
    async function loadSlots() {
      if (!selectedBarberId || !reservation.serviceId) {
        setSlots([]);
        return;
      }

      setLoadingSlots(true);
      const params = new URLSearchParams({
        branchId: reservation.branchId,
        serviceId: reservation.serviceId,
        date: reservationDate,
        employeeId: selectedBarberId
      });
      const response = await fetch(`/api/public/availability?${params}`);
      const data = await response.json();
      setLoadingSlots(false);
      setSlots(response.ok ? data.slots ?? [] : []);
    }

    loadSlots();
  }, [reservation.branchId, reservation.serviceId, reservationDate, selectedBarberId]);

  const availabilityChecked = !reservation.serviceId || !selectedBarberId || slots.includes(reservationTime);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBarberId) {
      await showWarning("Barbero requerido", "Selecciona un barbero para confirmar la atencion.");
      return;
    }
    if (!availabilityChecked) {
      await showError("Barbero ocupado", "El barbero no esta disponible en la fecha y hora de la reserva.");
      return;
    }
    await onConfirm(selectedBarberId);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Confirmar atencion</p>
            <h2 className="mt-2 text-2xl font-semibold">Asignar barbero</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{reservation.customer} - {formatDate(reservation.startsAt)} - {reservationTime}</p>
          </div>
          <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={onClose}>Cerrar</button>
        </div>

        <label className="mt-5 block text-sm text-[var(--text-muted)]">Barbero activo de la sede
          <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={selectedBarberId} onChange={(event) => setSelectedBarberId(event.target.value)}>
            <option value="">Selecciona un barbero</option>
            {branchBarbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
        </label>

        {selectedBarberId ? (
          <p className={`mt-3 rounded-lg border px-3 py-2 text-sm ${availabilityChecked ? "border-green-500/40 text-green-200" : "border-red-500/40 text-red-200"}`}>
            {loadingSlots
              ? "Validando disponibilidad..."
              : availabilityChecked
                ? "Disponible para el horario de la reserva."
                : "Ocupado en el horario de la reserva."}
          </p>
        ) : null}

        {branchBarbers.length === 0 ? <p className="mt-3 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--text-muted)]">No hay barberos activos en esta sede.</p> : null}

        <button type="submit" disabled={busy || loadingSlots || branchBarbers.length === 0} className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black disabled:opacity-60">
          {busy ? "Procesando..." : "Confirmar atencion"}
        </button>
      </form>
    </div>
  );
}

function RescheduleModal({
  reservation,
  options,
  me,
  onClose,
  onSaved
}: {
  reservation: ReservationSummary;
  options: { branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[] };
  me: { role: string; branchId: string | null; branchName: string | null } | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const initialDate = reservation.startsAt.slice(0, 10);
  const [branchId, setBranchId] = useState(me?.role === "recepcion" ? me.branchId ?? reservation.branchId : reservation.branchId);
  const [barberId, setBarberId] = useState(reservation.barberId ?? "");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(formatTime(reservation.startsAt));
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedService = options.services.find((service) => service.id === reservation.serviceId);
  const branchBarbers = options.barbers.filter((barber) => !branchId || barber.branchId === branchId);
  const canChangeBranch = me?.role === "admin";
  const hasServiceForAvailability = Boolean(reservation.serviceId);

  useEffect(() => {
    async function loadSlots() {
      if (!branchId || !reservation.serviceId || !date) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      const params = new URLSearchParams({ branchId, serviceId: reservation.serviceId, date });
      if (barberId) params.set("employeeId", barberId);
      const response = await fetch(`/api/public/availability?${params}`);
      const data = await response.json();
      setLoadingSlots(false);
      const nextSlots = response.ok ? data.slots ?? [] : [];
      if (date === initialDate && !nextSlots.includes(formatTime(reservation.startsAt))) {
        nextSlots.unshift(formatTime(reservation.startsAt));
      }
      setSlots(nextSlots);
    }
    loadSlots();
  }, [branchId, barberId, date, initialDate, reservation.serviceId, reservation.startsAt]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !date || !time) {
      await showWarning("Datos incompletos", "Selecciona sede, fecha y hora.");
      return;
    }
    if (!reason.trim()) {
      await showWarning("Motivo requerido", "Registra el motivo de la reprogramacion.");
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/control/reservations/${reservation.id}/reschedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        barberId: barberId || null,
        date,
        startTime: time,
        reason: reason.trim()
      })
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      await showError("No se pudo reprogramar", data.error ?? "Revisa disponibilidad y permisos.");
      return;
    }

    await showSuccess(data.overlapWarning ? "Reserva reprogramada con advertencia" : "Reserva reprogramada", data.overlapWarning ? "Existe una reserva no confirmada solapada para el barbero." : "");
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Reprogramacion</p>
            <h2 className="mt-2 text-2xl font-semibold">{reservation.customer}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{reservation.service} - {selectedService?.durationMinutes ?? 60} min</p>
          </div>
          <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={onClose}>Cerrar</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[var(--text-muted)]">Sede
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={branchId} disabled={!canChangeBranch} onChange={(event) => { setBranchId(event.target.value); setBarberId(""); setTime(""); }}>
              <option value="">Selecciona sede</option>
              {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[var(--text-muted)]">Barbero
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={barberId} onChange={(event) => { setBarberId(event.target.value); setTime(""); }}>
              <option value="">Sin asignar</option>
              {branchBarbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
            </select>
          </label>
          <Field label="Nueva fecha" type="date" value={date} onChange={(value) => { setDate(value); setTime(""); }} />
          {hasServiceForAvailability ? (
            <label className="text-sm text-[var(--text-muted)]">Hora disponible
              <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={time} onChange={(event) => setTime(event.target.value)}>
                <option value="">{loadingSlots ? "Cargando..." : "Selecciona hora"}</option>
                {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
          ) : (
            <Field label="Nueva hora" type="time" value={time} onChange={setTime} />
          )}
          <label className="text-sm text-[var(--text-muted)] md:col-span-2">Motivo
            <textarea className="mt-2 min-h-24 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Cliente pidio cambio de horario" />
          </label>
        </div>

        <button type="submit" disabled={saving || loadingSlots} className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar reprogramacion"}
        </button>
      </form>
    </div>
  );
}

function ReservationDetailModal({
  reservation,
  onClose,
  onReschedule,
  onViewAttention
}: {
  reservation: ReservationSummary;
  onClose: () => void;
  onReschedule: () => void;
  onViewAttention: () => void;
}) {
  const canReschedule = reservation.status === "pendiente" || reservation.status === "contactado" || reservation.status === "confirmado";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Detalle de reserva</p>
            <h2 className="mt-2 text-2xl font-semibold">{reservation.customer}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{formatDate(reservation.startsAt)} - {formatTime(reservation.startsAt)} a {formatTime(reservation.endsAt)}</p>
          </div>
          <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={onClose}>Cerrar</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <DetailItem label="Cliente" value={reservation.customer} />
          <DetailItem label="Celular" value={reservation.customerPhone || "No registrado"} />
          <DetailItem label="Sede" value={reservation.branch} />
          <DetailItem label="Barbero" value={reservation.barber ?? "Por asignar"} />
          <DetailItem label="Servicio" value={reservation.service} />
          <DetailItem label="Precio" value={reservation.price == null ? "Por confirmar" : `S/ ${reservation.price}`} />
          <DetailItem label="Estado" value={reservation.status} />
          <DetailItem label="Origen" value={reservation.source} />
          <DetailItem label="Atencion vinculada" value={reservation.serviceOrderId ? reservation.serviceOrderId : "Sin atencion vinculada"} />
          <DetailItem label="Historial basico" value={reservation.observations || "Sin cambios registrados en observaciones."} wide />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={async () => {
            if (reservation.whatsappTemplateMissing || !reservation.whatsappUrl) {
              await showWarning("No hay plantilla configurada para este estado.", reservation.whatsappTemplateMissing ? `Falta plantilla: ${reservation.whatsappTemplateMissing}` : "");
              return;
            }
            await fetch(`/api/control/reservations/${reservation.id}/whatsapp-link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: reservation.status }) });
            window.open(reservation.whatsappUrl, "_blank", "noopener,noreferrer");
          }}>
            <MessageCircle size={16} />
            WhatsApp
          </button>
          {canReschedule ? <button type="button" className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={onReschedule}>Reprogramar</button> : null}
          {reservation.serviceOrderId ? <button type="button" className="rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black" onClick={onViewAttention}>Ver atencion</button> : null}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-[var(--border-soft)] bg-black/35 p-3 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--gold-soft)]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-white">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; icon?: React.ReactNode }) {
  return (
    <label className="text-sm text-[var(--text-muted)]">
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
