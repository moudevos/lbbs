"use client";

import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

type ProfileData = {
  employee: Record<string, any>;
  metrics: { services: number };
  recentOrders: Record<string, any>[];
};

export function EmployeeProfileModal({ employeeId, onClose }: { employeeId: string | null; onClose: () => void }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employeeId) return;
    setData(null);
    setError("");
    const controller = new AbortController();
    fetch(`/api/control/employees/${employeeId}/profile`, { signal: controller.signal })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => response.ok ? setData(body) : setError(body.error ?? "No se pudo cargar el perfil"))
      .catch((reason) => {
        if (reason.name !== "AbortError") setError("No se pudo cargar el perfil");
      });
    return () => controller.abort();
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [employeeId, onClose]);

  if (!employeeId) return null;
  const employee = data?.employee;
  const branch = Array.isArray(employee?.branches) ? employee.branches[0] : employee?.branches;
  const fullName = `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim();

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar perfil" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[var(--border-soft)] bg-[#0b0b0b] p-5 shadow-2xl md:p-7">
        <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-4 top-4 rounded-full border border-[var(--border-soft)] p-2"><X size={18} /></button>
        {!data && !error ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 className="animate-spin" size={20} /> Cargando perfil...</div> : null}
        {error ? <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-100">{error}</div> : null}
        {data && employee ? (
          <div className="grid gap-6">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-black">
                {employee.profile_photo_url ? <Image src={employee.profile_photo_url} alt={fullName} fill unoptimized className="object-cover" /> : <div className="grid h-full place-items-center text-3xl text-[var(--gold-soft)]">{initials(fullName)}</div>}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">{employee.code} · {employee.role}</p>
                <h2 className="mt-2 text-3xl font-semibold">{fullName}</h2>
                {employee.nickname ? <p className="mt-1 text-sm text-[var(--gold-soft)]">Apodo: {employee.nickname}</p> : null}
                <p className="mt-2 text-sm text-[var(--text-muted)]">{employee.specialty || "Sin especialidad"} · {branch?.name || "Sin sede"}</p>
              </div>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Servicios totales" value={data.metrics.services} />
            </div>
            <section className="grid gap-3 rounded-2xl border border-[var(--border-soft)] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Celular" value={employee.phone || "Sin celular"} />
              <Info label="Email" value={employee.email || "Sin email"} />
              <Info label="Estado" value={employee.is_active ? "Activo" : "Inactivo"} />
              <Info label="Acceso Auth" value={employee.user_id ? "Sí" : "No"} />
              <Info label="Puede atender" value={employee.can_perform_services ? "Sí" : "No"} />
              <Info label="Onboarding" value={employee.onboarding_status || "Sin estado"} />
              <Info label="Registro" value={employee.created_at ? new Date(employee.created_at).toLocaleDateString("es-PE") : "-"} />
            </section>
            <section>
              <h3 className="font-semibold">Actividad reciente</h3>
              <div className="mt-3 grid gap-2">
                {data.recentOrders.length ? data.recentOrders.map((order) => {
                  const service = Array.isArray(order.services) ? order.services[0] : order.services;
                  const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
                  return <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm"><span>{order.service_date} · {service?.name || "Servicio"} · {customer?.full_name || "Cliente"}</span><span className="text-[var(--gold-soft)]">{order.status} · {money(order.total)}</span></div>;
                }) : <p className="text-sm text-[var(--text-muted)]">Sin actividad registrada.</p>}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[var(--border-soft)] bg-black/30 p-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 font-semibold text-[var(--gold)]">{value}</p></div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}
function money(value: unknown) {
  return `S/ ${Number(value ?? 0).toFixed(2)}`;
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "LB";
}
