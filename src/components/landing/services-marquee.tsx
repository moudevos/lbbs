import Link from "next/link";
import { ArrowRight, Facebook, Instagram, MessageCircle, Music2, Scissors } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingService } from "@/lib/public/landing-data";

function ServiceCard({ service }: { service: LandingService }) {
  return (
    <article className="flex h-full min-w-[82vw] snap-start flex-col justify-between rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/78 p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:-translate-y-1 sm:min-w-0">
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(234,157,77,0.12)] text-[var(--landing-gold-soft)]">
          <Scissors size={20} />
        </span>
        <h3 className="mt-4 text-xl font-semibold text-white">{service.name}</h3>
        <p className="mt-1 text-sm text-[var(--landing-gold-soft)]">{service.durationMinutes} min · {service.price == null ? "Consultar" : `S/ ${Number(service.price).toFixed(2)}`}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{service.description || `Servicio profesional de barbería en Iquitos${service.branchName ? ` - ${service.branchName}` : ""}.`}</p>
      </div>
      <Link href="/reservar" className="landing-secondary-button mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium">
        Reservar <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function ServicesMarquee({ services }: { services: LandingService[] }) {
  return (
    <section id="servicios" className="relative scroll-mt-24 bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <LandingSectionTitle eyebrow="Servicios y tarifas" title="Cortes y barbería premium en Iquitos" description="Corte clásico, fade, barba, perfilado y servicios personalizados con barberos profesionales en Iquitos." />
        </div>

        {services.length === 0 ? <Placeholder /> : null}
        {services.length > 0 ? (
          <div className="-mx-6 flex snap-x gap-5 overflow-x-auto px-6 pb-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Placeholder() {
  return (
    <div className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/70 p-6 text-sm text-[var(--text-muted)]">
      <p>Pronto mostraremos nuestros servicios disponibles. Escríbenos por redes o WhatsApp para coordinar tu atención.</p>
      <SocialPlaceholders />
    </div>
  );
}

function SocialPlaceholders() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {[["Instagram", Instagram], ["TikTok", Music2], ["Facebook", Facebook], ["WhatsApp", MessageCircle]].map(([label, Icon]) => (
        <span key={String(label)} className="inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] px-3 py-1.5 text-xs text-[var(--landing-gold-soft)]">
          <Icon size={13} /> {String(label)}
        </span>
      ))}
    </div>
  );
}
