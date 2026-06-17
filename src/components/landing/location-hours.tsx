import { MapPin, MessageCircle } from "lucide-react";
import type { LandingBranch, LandingSettings } from "@/lib/public/landing-data";
import { LandingSectionTitle } from "./landing-section-title";

export function LocationHours({ branches, settings }: { branches: LandingBranch[]; settings: LandingSettings }) {
  const phones = settings.phones.length ? settings.phones : branches.map((branch) => branch.phone).filter(Boolean) as string[];

  return (
    <section id="ubicacion" className="bg-[#071013] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <LandingSectionTitle eyebrow="Ubicación y horarios" title="Atención en Iquitos, Loreto" description="Encuentra nuestras sedes y reserva tu horario disponible desde la web." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {branches.length ? branches.map((branch) => (
            <article key={branch.id} className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/70 p-6">
              <h3 className="flex items-center gap-2 text-xl font-semibold text-white"><MapPin className="text-[var(--landing-gold-soft)]" size={20} /> {branch.name}</h3>
              <p className="mt-3 text-sm text-[var(--text-muted)]">{branch.address || "Dirección configurable desde el panel de administración."}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Horarios disponibles al reservar.</p>
              {branch.phone ? <a className="mt-5 inline-flex items-center gap-2 landing-secondary-button px-4 py-2 text-sm" href={`https://wa.me/51${branch.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a> : null}
            </article>
          )) : (
            <article className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/70 p-6 md:col-span-2">
              <h3 className="text-xl font-semibold text-white">Sedes y horarios</h3>
              <p className="mt-3 text-sm text-[var(--text-muted)]">Direcciones y horarios personalizables desde el panel de administración.</p>
            </article>
          )}
        </div>
        {phones[0] ? <a className="mt-6 inline-flex items-center gap-2 landing-primary-button px-5 py-3 text-sm" href={`https://wa.me/51${phones[0].replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Coordinar por WhatsApp</a> : null}
      </div>
    </section>
  );
}
