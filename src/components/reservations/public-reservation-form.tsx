"use client";

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
  Pencil,
  RotateCcw,
  Scissors,
  Sparkles,
  Store,
  UserRound
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

export function PublicReservationForm({ initialMainContact }: { initialMainContact: { phone: string | null } }) {
  const searchParams = useSearchParams();
  const requestedBranchId = searchParams.get("sede");
  const [options, setOptions] = useState<Options>({ branches: [], services: [], barbers: [] });
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState(1);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [customNote, setCustomNote] = useState("");
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
      .then((data) => {
        setOptions(data);
        // Si solo hay una sede, se preselecciona (igual que el diseno).
        if (requestedBranchId && (data.branches ?? []).some((branch: BranchOption) => branch.id === requestedBranchId)) {
          setForm((current) => ({ ...current, branchId: requestedBranchId }));
        } else if ((data.branches ?? []).length === 1) {
          setForm((current) => ({ ...current, branchId: data.branches[0].id }));
        }
      })
      .catch(() => swalThemed.fire("No se pudieron cargar las opciones", "Intenta nuevamente.", "error"))
      .finally(() => setLoadingOptions(false));
  }, [requestedBranchId]);

  useEffect(() => {
    if (!form.branchId || !form.serviceId || !form.date) return;
    setLoadingSlots(true);
    const params = new URLSearchParams({ branchId: form.branchId, serviceId: form.serviceId, date: form.date });
    if (form.employeeId) params.set("employeeId", form.employeeId);
    fetch(`/api/public/availability?${params}`)
      .then((response) => response.json())
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
    setForm((current) => ({ ...current, branchId, employeeId: "" }));
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
    const response = await fetch("/api/public/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, observations, employeeId: form.employeeId || null })
    });
    const data = await response.json();
    setLoading(false);

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

    // Reinicio del flujo manteniendo la sede elegida.
    setForm((current) => ({
      ...current,
      serviceId: "",
      employeeId: "",
      customerName: "",
      customerPhone: "",
      observations: ""
    }));
    setCustomNote("");
    setStep(2);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="landing-secondary-button inline-flex items-center gap-2 px-4 py-2 text-sm"><ArrowLeft size={16} /> Volver al inicio</Link>
        <Link href="/" className="text-sm text-[var(--text-muted)] transition hover:text-[var(--landing-gold-soft)]">Abrir landing</Link>
      </div>
      <BrandHeader contactPhone={contactPhone} contactUrl={contactUrl} />
      <ProgressBar step={step} />

      <div className="mt-6 rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/90 p-5 shadow-[0_35px_100px_-45px_rgba(234,157,77,0.55)] backdrop-blur sm:p-7">
        {loadingOptions ? <LoadingPanel label="Cargando sedes, servicios y especialistas..." /> : null}
        {!loadingOptions ? <>
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
            summary={{ branch: selectedBranch?.name ?? null, service: selectedService?.name ?? null }}
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
    <header className="text-center">
      <Divider />
      <h1 className="text-gold-gradient mt-3 text-4xl font-black tracking-[0.06em] sm:text-5xl">LA BAJADITA</h1>
      <p className="mt-2 text-xs font-semibold tracking-[0.42em] text-[var(--gold-soft)] sm:text-sm">BARBER STUDIO · IQUITOS</p>
      <Divider className="mt-3" />
      <p className="mt-4 text-sm text-[var(--text-muted)]">Atención de {CONTACT_HOURS}</p>
      {contactUrl ? <a href={contactUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#4ade80]/40 bg-[#4ade80]/5 px-4 py-2 text-sm font-bold text-[#4ade80]"><MessageCircle size={18} /> Consultar por WhatsApp {contactPhone}</a> : null}
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
    <div className="mt-7 grid grid-cols-4 gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <span key={index} className="progress-seg" data-on={index < step} />
      ))}
    </div>
  );
}

function StepHeading({ index, kicker, icon: Icon, title, hint }: { index: number; kicker: string; icon: typeof MapPin; title: string; hint: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gold)] text-sm font-bold text-black">{index}</span>
        <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold-soft)]">PASO {index} DE {TOTAL_STEPS} · {kicker}</p>
      </div>
      <h2 className="mt-3 flex items-center gap-2 text-2xl font-bold text-white">
        <Icon size={24} className="text-[var(--gold)]" /> {title}
      </h2>
      <p className="mt-1 text-sm italic text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-white">
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
            <button key={branch.id} type="button" onClick={() => onSelect(branch.id)} className="option-card p-5" data-selected={isSelected}>
              {isSelected ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <Store size={30} className="text-[var(--gold)]" />
                <div>
                  <p className="text-lg font-bold text-white">{branch.name}</p>
                  {branch.phone ? <p className="mt-1 text-sm text-[var(--text-muted)]">{branch.phone}</p> : null}
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

      <button type="button" onClick={onContinue} disabled={!selectedId} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold tracking-wide">
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
          <button type="button" onClick={() => onCustomNote(customNote)} className="option-card w-full border-dashed p-6 text-center" data-selected={customSelected} aria-pressed={customSelected}>
            <div className="flex flex-col items-center gap-2" onClick={(event) => { event.stopPropagation(); }}>
              <Pencil size={26} className="text-[var(--gold)]" />
              <p className="text-lg font-bold text-[var(--gold-soft)]">Otros / Personalizado</p>
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

      <div className="grid gap-3 sm:grid-cols-2">
        {standardServices.map((service) => {
          const isSelected = service.id === selectedId;
          return (
            <button key={service.id} type="button" onClick={() => onSelect(service.id)} className="option-card p-5 text-center" data-selected={isSelected}>
              {isSelected ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
              <div className="flex flex-col items-center gap-2 py-1">
                <Scissors size={24} className="text-[var(--gold)]" />
                <p className="text-base font-bold text-white">{service.name}</p>
                <p className="text-2xl font-black text-[var(--gold)]">{service.price == null ? "A consultar" : `S/ ${Number(service.price).toFixed(0)}`}</p>
                <p className="text-xs text-[var(--text-muted)]">{service.durationMinutes} min aprox</p>
              </div>
            </button>
          );
        })}
      </div>

      {standardServices.length === 0 && !customService ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">Cargando servicios…</p> : null}
    </div>
  );
}

/* ---------- Paso 3: Barbero ---------- */
function StepBarber({ barbers, selectedId, onBack, onSelect }: { barbers: BarberOption[]; selectedId: string; onBack: () => void; onSelect: (id: string) => void }) {
  return (
    <div>
      <BackButton label="Cambiar servicio" onClick={onBack} />
      <StepHeading index={3} kicker="ELIJA BARBERO" icon={UserRound} title="¿Con qué barbero prefiere atenderse?" hint={'Si no tiene preferencia, elija "Cualquiera disponible"'} />

      <button type="button" onClick={() => onSelect("")} className="option-card mb-4 w-full p-6 text-center" data-selected={selectedId === ""}>
        {selectedId === "" ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
        <div className="flex flex-col items-center gap-2">
          <Sparkles size={28} className="text-[var(--gold)]" />
          <p className="text-lg font-bold text-white">Cualquiera disponible</p>
          <p className="text-sm text-[var(--text-muted)]">Le asignamos el barbero según disponibilidad</p>
        </div>
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        {barbers.map((barber) => {
          const isSelected = barber.id === selectedId;
          return (
            <button key={barber.id} type="button" onClick={() => onSelect(barber.id)} className="option-card p-5 text-center" data-selected={isSelected}>
              {isSelected ? <span className="option-check"><Check size={15} strokeWidth={3} /></span> : null}
              <div className="flex flex-col items-center gap-2 py-1">
                <UserRound size={26} className="text-[var(--gold)]" />
                <p className="text-base font-bold text-white">{barber.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Barbero</p>
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
  summary: { branch: string | null; service: string | null };
  onBack: () => void;
  onChange: (patch: Partial<{ customerName: string; customerPhone: string; date: string; time: string; observations: string }>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <BackButton label="Cambiar barbero" onClick={onBack} />
      <StepHeading index={4} kicker="SUS DATOS" icon={CalendarDays} title="¿Cuándo desea su cita?" hint="Complete sus datos y la fecha que desea atenderse" />

      {summary.branch || summary.service ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {summary.branch ? <span className="rounded-full border border-[var(--border-soft)] bg-black/40 px-3 py-1 text-xs text-[var(--gold-soft)]">{summary.branch}</span> : null}
          {summary.service ? <span className="rounded-full border border-[var(--border-soft)] bg-black/40 px-3 py-1 text-xs text-[var(--gold-soft)]">{summary.service}</span> : null}
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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

      <button type="submit" disabled={loading} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold tracking-wide">
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
