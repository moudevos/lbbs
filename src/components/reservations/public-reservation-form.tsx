"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { CalendarCheck } from "lucide-react";
import type { BarberOption, BranchOption, ServiceOption } from "@/lib/reservations/types";

type Options = {
  branches: BranchOption[];
  services: ServiceOption[];
  barbers: BarberOption[];
};

export function PublicReservationForm() {
  const [options, setOptions] = useState<Options>({ branches: [], services: [], barbers: [] });
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    branchId: "",
    serviceId: "",
    employeeId: "",
    customerName: "",
    customerPhone: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    observations: ""
  });

  useEffect(() => {
    fetch("/api/public/reservation-options")
      .then((response) => response.json())
      .then((data) => setOptions(data));
  }, []);

  useEffect(() => {
    if (!form.branchId || !form.serviceId || !form.date) return;
    const params = new URLSearchParams({ branchId: form.branchId, serviceId: form.serviceId, date: form.date });
    if (form.employeeId) params.set("employeeId", form.employeeId);
    fetch(`/api/public/availability?${params}`)
      .then((response) => response.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setForm((current) => ({ ...current, time: data.slots?.[0] ?? "" }));
      });
  }, [form.branchId, form.serviceId, form.employeeId, form.date]);

  const branchBarbers = options.barbers.filter((barber) => !form.branchId || barber.branchId === form.branchId);
  const branchServices = options.services.filter((service) => !form.branchId || !service.branchId || service.branchId === form.branchId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.branchId || !form.serviceId || !form.customerName || !form.customerPhone || !form.date || !form.time) {
      await Swal.fire("Datos incompletos", "Completa sede, servicio, cliente, fecha y hora.", "warning");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/public/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, employeeId: form.employeeId || null })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      await Swal.fire("No se pudo reservar", data.error ?? "Intenta nuevamente.", "error");
      return;
    }

    await Swal.fire(
      "Reserva enviada",
      data.overlapWarning
        ? "Tu reserva quedo pendiente. Hay otra solicitud cercana y recepcion confirmara disponibilidad."
        : "Tu reserva quedo pendiente. Recepcion se comunicara para confirmarla.",
      "success"
    );
    setForm((current) => ({ ...current, customerName: "", customerPhone: "", observations: "" }));
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-[var(--text-muted)]">
          Sede
          <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value, employeeId: "" })}>
            <option value="">Seleccionar</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-[var(--text-muted)]">
          Servicio
          <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
            <option value="">Seleccionar</option>
            {branchServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.durationMinutes} min - {service.price == null ? "Precio por confirmar" : `S/ ${Number(service.price).toFixed(2)}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[var(--text-muted)]">
          Barbero opcional
          <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
            <option value="">Por asignar</option>
            {branchBarbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-[var(--text-muted)]">
          Fecha
          <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </label>
        <label className="text-sm text-[var(--text-muted)]">
          Hora disponible
          <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })}>
            <option value="">Seleccionar</option>
            {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          </select>
        </label>
        <label className="text-sm text-[var(--text-muted)]">
          Celular
          <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} />
        </label>
      </div>
      <label className="text-sm text-[var(--text-muted)]">
        Nombre completo
        <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} />
      </label>
      <label className="text-sm text-[var(--text-muted)]">
        Observaciones
        <textarea className="mt-2 min-h-24 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} />
      </label>
      <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:opacity-60" disabled={loading}>
        <CalendarCheck size={18} />
        {loading ? "Enviando..." : "Solicitar reserva"}
      </button>
    </form>
  );
}
