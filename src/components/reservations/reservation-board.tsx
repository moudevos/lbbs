"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { CalendarCheck, MessageCircle, RefreshCw, UserRound } from "lucide-react";
import type { BarberOption, BranchOption, ReservationStatus, ReservationSummary, ServiceOption } from "@/lib/reservations/types";
import { formatDate, formatTime } from "@/lib/reservations/time";

const statuses: ReservationStatus[] = ["pendiente", "contactado", "confirmado", "atendido", "cancelado", "no_asistio"];

export function ReservationBoard({ mode }: { mode: "reservas" | "agenda" }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("");
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ role: string; branchId: string | null; branchName: string | null } | null>(null);
  const [options, setOptions] = useState<{ branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[] }>({ branches: [], services: [], barbers: [] });
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ date });
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    if (status) params.set("status", status);
    const response = await fetch(`/api/control/reservations?${params}`);
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      await Swal.fire("No se pudo cargar", data.error ?? "Error desconocido", "error");
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
  }, [date, status]);

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

  async function changeStatus(id: string, nextStatus: ReservationStatus) {
    if (["cancelado", "no_asistio", "confirmado"].includes(nextStatus)) {
      const result = await Swal.fire({
        title: `Cambiar a ${nextStatus}`,
        text: "Esta accion sera auditada.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      });
      if (!result.isConfirmed) return;
    }

    const response = await fetch(`/api/control/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await response.json();

    if (!response.ok) {
      await Swal.fire("Accion rechazada", data.error ?? "No se pudo actualizar.", "error");
      return;
    }

    await load();
    await Swal.fire("Reserva actualizada", "", "success");
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

      <div className="grid gap-3">
        {loading ? <p className="text-sm text-[var(--text-muted)]">Cargando...</p> : null}
        {!loading && reservations.length === 0 ? <p className="rounded-lg border border-[var(--border-soft)] p-4 text-sm text-[var(--text-muted)]">No hay reservas para los filtros seleccionados.</p> : null}
        {reservations.map((reservation) => (
          <article key={reservation.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--gold-soft)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[rgba(212,175,55,0.14)] px-2 py-1 text-xs text-[var(--gold-soft)]">{reservation.status}</span>
                  <span className="text-sm text-[var(--text-muted)]">{formatDate(reservation.startsAt)} - {formatTime(reservation.startsAt)} a {formatTime(reservation.endsAt)}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{reservation.customer}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{reservation.service} - {reservation.branch} - {reservation.barber ?? "Barbero por asignar"}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Celular: {reservation.customerPhone || "No registrado"} - Precio: {reservation.price == null ? "Por confirmar" : `S/ ${reservation.price}`}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" href={reservation.whatsappUrl} target="_blank">
                  <MessageCircle size={16} />
                  WhatsApp
                </a>
                {statuses.map((item) => (
                  <button key={item} type="button" onClick={() => changeStatus(reservation.id, item)} className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--text-muted)] hover:text-white">
                    {item}
                  </button>
                ))}
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
      await Swal.fire("Precio requerido", "No se puede confirmar un servicio personalizado sin precio.", "warning");
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
      await Swal.fire("No se pudo crear", data.error ?? "Error desconocido", "error");
      return;
    }
    if (data.customerNameDiffers) {
      const confirmed = await Swal.fire({
        title: "Cliente encontrado. ¿Deseas usar este cliente?",
        text: data.customer?.full_name ? `Se usara: ${data.customer.full_name}` : "El celular ya pertenece a un cliente registrado.",
        icon: "question",
        confirmButtonText: "Usar cliente",
        showCancelButton: false
      });
      if (!confirmed.isConfirmed) return;
    }
    await Swal.fire(data.overlapWarning ? "Reserva creada con advertencia" : "Reserva creada", data.overlapWarning ? "Existe una reserva pendiente/contactada solapada para el barbero." : "", data.overlapWarning ? "warning" : "success");
    await onCreated();
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
          <Field icon={<UserRound size={16} />} label="Celular del cliente" value={form.customerPhone} onChange={(value) => setForm({ ...form, customerPhone: value })} />
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

function Field({ label, value, onChange, type = "text", icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; icon?: React.ReactNode }) {
  return (
    <label className="text-sm text-[var(--text-muted)]">
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
