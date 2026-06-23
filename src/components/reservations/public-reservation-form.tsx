"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  MessageCircle,
  LoaderCircle,
  Clock3,
  Palette,
  Pencil,
  RotateCcw,
  Scissors,
  Sparkles,
  Store,
  UserRound,
  WandSparkles
} from "lucide-react";
import { swalThemed } from "@/lib/ui/swal";
import type { BarberOption, BranchOption, ServiceOption } from "@/lib/reservations/types";

type Options = {
  branches: BranchOption[];
  services: ServiceOption[];
  barbers: BarberOption[];
  mainContact?: { phone: string | null };
};

const CONTACT_HOURS = "Lunes a Sábado · 9:30 AM a 9:30 PM";

const TOTAL_STEPS = 4;

function emptyReservationForm() {
  return {
    branchId: "",
    serviceId: "",
    employeeId: "",
    customerName: "",
    customerPhone: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    observations: ""
  };
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function reservationServiceIcon(name: string) {
  const normalized = name.toLocaleLowerCase("es");
  if (/(barba|perfilado)/.test(normalized)) return UserRound;
  if (/(facial|limpieza|mascarilla)/.test(normalized)) return Sparkles;
  if (/(color|tinte|platinado|mecha)/.test(normalized)) return Palette;
  if (/(alisado|cabello|peinado)/.test(normalized)) return WandSparkles;
  return Scissors;
}

export function PublicReservationForm({ initialMainContact }: { initialMainContact: { phone: string | null } }) {
  const searchParams = useSearchParams();
  const requestedBranchId = searchParams.get("sede");
  const [options, setOptions] = useState<Options>({ branches: [], services: [], barbers: [] });
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState(1);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [form, setForm] = useState(emptyReservationForm);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");
      try {
        const response = await fetch("/api/public/reservation-options", { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar las opciones");
        const nextOptions: Options = {
          branches: Array.isArray(data.branches) ? data.branches : [],
          services: Array.isArray(data.services) ? data.services : [],
          barbers: Array.isArray(data.barbers) ? data.barbers : [],
          mainContact: data.mainContact
        };
        setOptions(nextOptions);
        // Si solo hay una sede, se preselecciona (igual que el diseno).
        if (requestedBranchId && nextOptions.branches.some((branch) => branch.id === requestedBranchId)) {
          setForm((current) => ({ ...current, branchId: requestedBranchId }));
        } else if (nextOptions.branches.length === 1) {
          setForm((current) => ({ ...current, branchId: nextOptions.branches[0].id }));
        }
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setOptionsError(reason instanceof Error ? reason.message : "No se pudieron cargar las opciones");
      } finally {
        if (!controller.signal.aborted) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => controller.abort();
  }, [requestedBranchId]);

  useEffect(() => {
    if (!form.branchId || !form.serviceId || !form.date) return;
    setLoadingSlots(true);
    const params = new URLSearchParams({ branchId: form.branchId, serviceId: form.serviceId, date: form.date });
    if (form.employeeId) params.set("employeeId", form.employeeId);
    fetch(`/api/public/availability?${params}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los horarios");
        return data;
      })
      .then((data) => {
        setSlots(data.slots ?? []);
        setForm((current) => ({ ...current, time: data.slots?.[0] ?? "" }));
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [form.branchId, form.serviceId, form.employeeId, form.date]);

  const branchBarbers = options.barbers.filter((barber) => !form.branchId || barber.branchId === form.branchId);
  const branchServices = options.services.filter((service) => !form.branchId || !service.branchId || service.branchId === form.branchId);

  const customService = useMemo(() => branchServices.find((service) => service.sku === "CUSTOM"), [branchServices]);
  const standardServices = useMemo(() => branchServices.filter((service) => service.sku !== "CUSTOM"), [branchServices]);

  const selectedBranch = options.branches.find((branch) => branch.id === form.branchId) ?? null;
  const selectedService = branchServices.find((service) => service.id === form.serviceId) ?? null;
  const contactPhone = selectedBranch?.phone || options.mainContact?.phone || initialMainContact.phone;
  const contactMessage = selectedBranch && selectedService
    ? `Hola, quiero consultar por ${selectedService.name} en ${selectedBranch.name} de La Bajadita Barber Studio.`
    : "Hola, quiero consultar una atención en La Bajadita Barber Studio.";
  const contactDigits = contactPhone?.replace(/\D/g, "") ?? "";
  const contactUrl = contactPhone
    ? `https://wa.me/${contactDigits.startsWith("51") ? contactDigits : `51${contactDigits}`}?text=${encodeURIComponent(contactMessage)}`
    : null;
  const isCustomSelected = Boolean(customService && form.serviceId === customService.id);

  function goTo(next: number) {
    setStep(Math.min(TOTAL_STEPS, Math.max(1, next)));
  }

  function selectBranch(branchId: string) {
    setSlots([]);
    setForm((current) => ({ ...current, branchId, serviceId: "", employeeId: "", time: "" }));
  }

  function selectService(serviceId: string) {
    setForm((current) => ({ ...current, serviceId }));
    goTo(3);
  }

  function selectBarber(employeeId: string) {
    setForm((current) => ({ ...current, employeeId }));
    goTo(4);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (!form.branchId || !form.serviceId || !form.customerName || !form.customerPhone || !form.date || !form.time) {
      await swalThemed.fire("Datos incompletos", "Completa sede, servicio, cliente, fecha y hora.", "warning");
      return;
    }

    const observations = isCustomSelected && customNote.trim()
      ? `[Personalizado: ${customNote.trim()}] ${form.observations}`.trim()
      : form.observations;

    setLoading(true);
    try {
      const response = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, observations, employeeId: form.employeeId || null })
      });
      const data = await response.json();
      if (!response.ok) {
        await swalThemed.fire("No se pudo reservar", data.error ?? "Intenta nuevamente.", "error");
        return;
      }

      await swalThemed.fire(
        "Reserva enviada",
        data.overlapWarning
          ? "Tu reserva quedó pendiente. Hay otra solicitud cercana y recepción confirmará disponibilidad."
          : "Tu reserva quedó pendiente. Recepción se comunicará para confirmarla.",
        "success"
      );

      setForm(emptyReservationForm());
      setSlots([]);
      setCustomNote("");
      setShowAllBranches(true);
      setStep(1);
    } catch {
      await swalThemed.fire("No se pudo reservar", "Revisa tu conexión e intenta nuevamente.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" className="reservation-secondary-button"><ArrowLeft size={15} /> Volver al inicio</Link>
        <Link href="/" className="hidden text-xs text-[var(--text-muted)] transition hover:text-white sm:block">La Bajadita Barber Studio</Link>
      </div>
      <BrandHeader contactPhone={contactPhone} contactUrl={contactUrl} />
      <ProgressBar step={step} />

      <div key={step} className="reservation-step mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl backdrop-blur md:p-7">
        {loadingOptions ? <LoadingPanel label="Cargando sedes, servicios y especialistas..." /> : null}
        {!loadingOptions && optionsError ? <ErrorPanel message={optionsError} /> : null}
        {!loadingOptions && !optionsError ? <>
        {step === 1 ? (
          <StepBranch
            branches={options.branches}
            selectedId={form.branchId}
            showAll={showAllBranches}
            onShowAll={() => setShowAllBranches(true)}
            onSelect={selectBranch}
            onContinue={() => form.branchId && goTo(2)}
          />
        ) : null}

        {step === 2 ? (
          <StepService
            customService={customService}
            standardServices={standardServices}
            selectedId={form.serviceId}
            customNote={customNote}
            onCustomNote={setCustomNote}
            onBack={() => goTo(1)}
            onSelect={selectService}
          />
        ) : null}

        {step === 3 ? (
          <StepBarber barbers={branchBarbers} selectedId={form.employeeId} onBack={() => goTo(2)} onSelect={selectBarber} />
        ) : null}

        {step === 4 ? (
          <StepDetails
            form={form}
            slots={slots}
            loading={loading}
            loadingSlots={loadingSlots}
            summary={{
              branch: selectedBranch?.name ?? null,
              service: selectedService?.name ?? null,
              barber: form.employeeId
                ? branchBarbers.find((barber) => barber.id === form.employeeId)?.name ?? null
                : "Cualquiera disponible",
              price: selectedService?.price ?? null
            }}
            onBack={() => goTo(3)}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            onSubmit={submit}
          />
        ) : null}
        </> : null}
      </div>
    </div>
  );
}

function BrandHeader({ contactPhone, contactUrl }: { contactPhone: string | null; contactUrl: string | null }) {
  return (
    <header className="reservation-brand-header text-center">
      <Divider />
      <h1 className="text-gold-gradient mt-3 text-3xl font-black tracking-[0.06em] sm:text-4xl">LA BAJADITA</h1>
      <p className="mt-2 text-xs font-semibold tracking-[0.42em] text-[var(--gold-soft)] sm:text-sm">BARBER STUDIO · IQUITOS</p>
      <Divider className="mt-3" />
      <p className="mt-4 text-sm text-[var(--text-muted)]">Atención de {CONTACT_HOURS}</p>
      {contactUrl ? <a href={contactUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-2 text-xs font-semibold text-[#86efac] transition hover:bg-[#4ade80]/15"><MessageCircle size={15} /> WhatsApp {contactPhone}</a> : null}
    </header>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[var(--gold)]/60 sm:w-24" />
      <Scissors size={16} className="text-[var(--gold)]" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[var(--gold)]/60 sm:w-24" />
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="reservation-progress mt-7 grid grid-cols-4 gap-2" aria-label={`Paso ${step} de ${TOTAL_STEPS}`}>
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <span key={index} className="progress-seg" data-on={index < step} />
      ))}
    </div>
  );
}

function StepHeading({ index, kicker, icon: Icon, title, hint }: { index: number; kicker: string; icon: typeof MapPin; title: string; hint: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gold)] text-sm font-bold text-black">{index}</span>
        <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold-soft)]">PASO {index} DE {TOTAL_STEPS} · {kicker}</p>
      </div>
      <h2 className="mt-3 flex items-center gap-2 text-xl font-bold text-white sm:text-2xl">
        <Icon size={21} className="text-[var(--gold)]" /> {title}
      </h2>
      <p className="mt-1 text-sm italic text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="reservation-secondary-button mb-5">
      <ArrowLeft size={16} /> {label}
    </button>
  );
}

/* ---------- Paso 1: Sede ---------- */
function StepBranch({
  branches,
  selectedId,
  showAll,
  onShowAll,
  onSelect,
  onContinue
}: {
  branches: BranchOption[];
  selectedId: string;
  showAll: boolean;
  onShowAll: () => void;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  const collapsed = branches.length > 1 && !showAll && Boolean(selectedId);
  const visible = collapsed ? branches.filter((branch) => branch.id === selectedId) : branches;

  return (
    <div>
      <StepHeading index={1} kicker="ELIJA SEDE" icon={MapPin} title="¿En qué sede desea atenderse?" hint="Toque la sede de su preferencia" />

      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((branch) => {
          const isSelected = branch.id === selectedId;
          return (
            <button key={branch.id} type="button" onClick={() => onSelect(branch.id)} className="option-card p-4" data-selected={isSelected}>
              {isSelected ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
              <div className="flex items-center gap-3 text-left">
                <span className="reservation-icon"><Store size={19} /></span>
                <div>
                  <p className="text-base font-semibold text-white">{branch.name}</p>
                  {branch.phone ? <p className="mt-1 text-xs text-[var(--text-muted)]">{branch.phone}</p> : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {branches.length === 0 ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando sedes…</p> : null}

      {collapsed ? (
        <button type="button" onClick={onShowAll} className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] transition hover:border-[var(--border-strong)]">
          <RotateCcw size={15} /> ¿Se equivocó? Ver todas las sedes
        </button>
      ) : null}

      <button type="button" onClick={onContinue} disabled={!selectedId} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-wide">
        CONTINUAR <ArrowRight size={18} />
      </button>
    </div>
  );
}

/* ---------- Paso 2: Servicio ---------- */
function StepService({
  customService,
  standardServices,
  selectedId,
  customNote,
  onCustomNote,
  onBack,
  onSelect
}: {
  customService?: ServiceOption;
  standardServices: ServiceOption[];
  selectedId: string;
  customNote: string;
  onCustomNote: (value: string) => void;
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const customSelected = Boolean(customService && selectedId === customService.id);

  return (
    <div>
      <BackButton label="Cambiar sede" onClick={onBack} />
      <StepHeading index={2} kicker="ELIJA SERVICIO" icon={Scissors} title="¿Qué servicio desea?" hint={'Si no encuentra su servicio, elija "Otros" y escriba lo que necesita'} />

      {customService ? (
        <div className="mb-4">
          <button type="button" onClick={() => onCustomNote(customNote)} className="option-card w-full border-dashed p-5 text-center" data-selected={customSelected} aria-pressed={customSelected}>
            <div className="flex flex-col items-center gap-2" onClick={(event) => { event.stopPropagation(); }}>
              <span className="reservation-icon"><Pencil size={18} /></span>
              <p className="text-base font-bold text-white">Otros servicios</p>
              <p className="text-sm font-semibold text-[var(--gold-soft)]">Consultar</p>
              <p className="text-xs font-bold tracking-wide text-[var(--text-muted)]">¿NO ENCUENTRA SU SERVICIO?</p>
              <input
                value={customNote}
                onChange={(event) => onCustomNote(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                placeholder="Toque aquí y escriba lo que necesita"
                className="field-input mt-2 text-center"
              />
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); onSelect(customService.id); }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] transition hover:bg-[rgba(212,175,55,0.1)]"
              >
                Usar este servicio <ArrowRight size={15} />
              </button>
            </div>
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {standardServices.map((service) => {
          const isSelected = service.id === selectedId;
          const ServiceIcon = reservationServiceIcon(service.name);
          return (
            <button key={service.id} type="button" onClick={() => onSelect(service.id)} className="option-card min-h-52 p-5 text-left" data-selected={isSelected}>
              {isSelected ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
              <div className="flex h-full flex-col items-start gap-2">
                <span className="reservation-icon"><ServiceIcon size={18} /></span>
                <p className="line-clamp-2 text-base font-semibold text-white">{service.name}</p>
                <p className="line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{service.description || "Servicio profesional con acabado premium."}</p>
                <div className="mt-auto flex w-full items-center gap-2 pt-3 text-xs text-[var(--gold-soft)]">
                  <Clock3 size={14} />
                  <p>{service.durationMinutes ? `${service.durationMinutes} min` : "Duración variable"}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {standardServices.length === 0 && !customService ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">No hay servicios disponibles para esta sede.</p> : null}
    </div>
  );
}

/* ---------- Paso 3: Barbero ---------- */
function StepBarber({ barbers, selectedId, onBack, onSelect }: { barbers: BarberOption[]; selectedId: string; onBack: () => void; onSelect: (id: string) => void }) {
  return (
    <div>
      <BackButton label="Cambiar servicio" onClick={onBack} />
      <StepHeading index={3} kicker="ELIJA BARBERO" icon={UserRound} title="¿Con qué barbero prefiere atenderse?" hint={'Si no tiene preferencia, elija "Cualquiera disponible"'} />

      <button type="button" onClick={() => onSelect("")} className="option-card mb-4 w-full p-4 text-left" data-selected={selectedId === ""}>
        {selectedId === "" ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
        <div className="flex items-center gap-3">
          <span className="reservation-avatar"><Sparkles size={21} /></span>
          <div><p className="text-base font-semibold text-white">Cualquiera disponible</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Le asignamos el barbero según disponibilidad</p></div>
        </div>
      </button>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => {
          const isSelected = barber.id === selectedId;
          return (
            <button key={barber.id} type="button" onClick={() => onSelect(barber.id)} className="option-card p-4 text-left" data-selected={isSelected}>
              {isSelected ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
              <div className="flex items-center gap-3">
                <span className="reservation-avatar overflow-hidden">{barber.profilePhotoUrl ? <img src={barber.profilePhotoUrl} alt={barber.name} className="h-full w-full object-cover" /> : getInitials(barber.name)}</span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{barber.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--gold-soft)]">{barber.nickname || "\u00a0"}</p>
                <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{barber.specialty || "Barbero profesional"}</p></div>
              </div>
            </button>
          );
        })}
      </div>

      {barbers.length === 0 ? <p className="py-4 text-center text-sm text-[var(--text-muted)]">No hay barberos listados; continúe y le asignaremos uno.</p> : null}
    </div>
  );
}

/* ---------- Paso 4: Datos ---------- */
function StepDetails({
  form,
  slots,
  loading,
  loadingSlots,
  summary,
  onBack,
  onChange,
  onSubmit
}: {
  form: { customerName: string; customerPhone: string; date: string; time: string; observations: string };
  slots: string[];
  loading: boolean;
  loadingSlots: boolean;
  summary: { branch: string | null; service: string | null; barber: string | null; price: number | null };
  onBack: () => void;
  onChange: (patch: Partial<{ customerName: string; customerPhone: string; date: string; time: string; observations: string }>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <BackButton label="Cambiar barbero" onClick={onBack} />
      <StepHeading index={4} kicker="SUS DATOS" icon={CalendarDays} title="¿Cuándo desea su cita?" hint="Complete sus datos y la fecha que desea atenderse" />

      {summary.branch || summary.service ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Resumen de su reserva</p>
          <div className="flex flex-wrap gap-2">
          {summary.branch ? <span className="rounded-full border border-[var(--border-soft)] bg-black/40 px-3 py-1 text-xs text-[var(--gold-soft)]">{summary.branch}</span> : null}
          {summary.service ? <span className="rounded-full border border-[var(--border-soft)] bg-black/40 px-3 py-1 text-xs text-[var(--gold-soft)]">{summary.service}</span> : null}
          {summary.barber ? <span className="rounded-full border border-[var(--border-soft)] bg-black/40 px-3 py-1 text-xs text-[var(--gold-soft)]">{summary.barber}</span> : null}
          <span className="rounded-full border border-[var(--border-soft)] bg-black/40 px-3 py-1 text-xs text-[var(--gold-soft)]">{summary.price == null ? "Precio por confirmar" : `S/ ${Number(summary.price).toFixed(0)}`}</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="field-label">Su nombre completo</span>
          <input className="field-input" placeholder="Ej: Carlos Pérez" value={form.customerName} onChange={(event) => onChange({ customerName: event.target.value })} />
        </label>

        <label className="grid gap-2">
          <span className="field-label">Su WhatsApp (con código de Perú si está fuera)</span>
          <input className="field-input" inputMode="tel" placeholder="9XX XXX XXX" value={form.customerPhone} onChange={(event) => onChange({ customerPhone: event.target.value })} />
        </label>

        <label className="grid gap-2">
          <span className="field-label">Fecha de la cita</span>
          <input className="field-input" type="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => onChange({ date: event.target.value })} />
        </label>

        <div className="grid gap-2">
          <span className="field-label">Hora disponible</span>
          {loadingSlots ? (
            <LoadingPanel label="Buscando horarios disponibles..." compact />
          ) : slots.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-soft)] bg-black/40 px-4 py-3 text-sm text-[var(--text-muted)]">No hay horarios disponibles para esta fecha. Pruebe con otro día.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button key={slot} type="button" className="slot-chip px-2 py-2 text-sm" data-selected={form.time === slot} onClick={() => onChange({ time: slot })}>
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="grid gap-2">
          <span className="field-label">Observaciones (opcional)</span>
          <textarea className="field-input min-h-24" placeholder="Algo que debamos saber…" value={form.observations} onChange={(event) => onChange({ observations: event.target.value })} />
        </label>
      </div>

      <button type="submit" disabled={loading} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold tracking-wide">
        {loading ? <><LoaderCircle size={18} className="animate-spin" /> ENVIANDO...</> : <>CONFIRMAR MI RESERVA <Check size={18} strokeWidth={3} /></>}
      </button>
    </form>
  );
}

function LoadingPanel({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-3 rounded-2xl border border-[var(--landing-border)] bg-black/25 text-sm text-[var(--text-muted)] ${compact ? "px-4 py-3" : "min-h-48 p-6"}`}>
      <LoaderCircle className="animate-spin text-[var(--landing-gold)]" size={20} /> {label}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-5 text-center">
      <p className="text-sm text-red-100">{message}</p>
      <button type="button" onClick={() => window.location.reload()} className="landing-secondary-button mt-4 px-4 py-2 text-sm">Reintentar</button>
    </div>
  );
}
