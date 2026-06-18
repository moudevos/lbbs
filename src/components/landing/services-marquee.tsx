"use client";

import Link from "next/link";
import { ArrowRight, Facebook, Instagram, MessageCircle, Music2, Scissors } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingService } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { useRef } from "react";
import { CarouselNavigation } from "./carousel-navigation";

function ServiceCard({ service }: { service: LandingService }) {
  return (
    <article data-carousel-card className="flex h-[24rem] min-w-[82vw] max-w-[82vw] snap-start flex-col rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/78 p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:-translate-y-1 sm:h-[25rem] sm:min-w-[360px] sm:max-w-[360px] lg:min-w-[calc((100%_-_2.5rem)/3)] lg:max-w-[calc((100%_-_2.5rem)/3)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(234,157,77,0.12)] text-[var(--landing-gold-soft)]">
          <Scissors size={20} />
        </span>
        <h3 className="mt-4 line-clamp-2 min-h-14 text-xl font-semibold text-white">{service.name}</h3>
        <p className="min-h-5 text-sm text-[var(--landing-gold-soft)]">{service.durationMinutes} min · {service.price == null ? "Consultar" : `S/ ${Number(service.price).toFixed(2)}`}</p>
        <p className="mt-3 line-clamp-4 min-h-[5rem] overflow-hidden text-sm leading-relaxed text-[var(--text-muted)]">{service.description || `Servicio profesional de barbería en Iquitos${service.branchName ? ` - ${service.branchName}` : ""}.`}</p>
      </div>
      <Link href="/reservar" onClick={() => trackEvent("service_click", { service_id: service.id, service_name: service.name })} className="landing-secondary-button mt-auto inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium">
        Reservar <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function ServicesMarquee({ services }: { services: LandingService[] }) {
  const visibleServices = limitPerBranch(services, 5);
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <section id="servicios" className="relative scroll-mt-24 bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <LandingSectionTitle eyebrow="Servicios y tarifas" title="Cortes y barbería premium en Iquitos" description="Corte clásico, fade, barba, perfilado y servicios personalizados con barberos profesionales en Iquitos." />
        </div>

        {visibleServices.length === 0 ? <Placeholder /> : null}
        {visibleServices.length > 0 ? (
          <>
          <div className="mb-4">
            <CarouselNavigation carouselRef={carouselRef} label="servicios" />
          </div>
          <div ref={carouselRef} className="no-scrollbar -mx-6 flex snap-x gap-5 overflow-x-auto overflow-y-hidden px-6 pb-3 lg:mx-0 lg:px-0">
            {visibleServices.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function limitPerBranch(services: LandingService[], limit: number) {
  const counts = new Map<string, number>();
  return services.filter((service) => {
    const key = service.branchId ?? "global";
    const count = counts.get(key) ?? 0;
    if (count >= limit) return false;
    counts.set(key, count + 1);
    return true;
  });
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
