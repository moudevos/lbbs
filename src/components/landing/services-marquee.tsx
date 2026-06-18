"use client";

import Link from "next/link";
import { ArrowRight, Facebook, Instagram, MessageCircle, Music2, Scissors } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingService } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { useRef } from "react";
import { CarouselNavigation } from "./carousel-navigation";
import { useLandingLanguage } from "./landing-language-provider";

function ServiceCard({ service }: { service: LandingService }) {
  const { t } = useLandingLanguage();
  return (
    <article data-carousel-card className="landing-service-card flex h-[20rem] min-w-[82vw] max-w-[82vw] snap-start flex-col p-6 sm:min-w-[340px] sm:max-w-[340px] lg:min-w-[calc((100%_-_2.5rem)/3)] lg:max-w-[calc((100%_-_2.5rem)/3)]">
      <div className="landing-service-card-content flex min-h-0 flex-1 flex-col items-center text-center">
        <span className="landing-service-card-icon flex h-14 w-14 items-center justify-center">
          <Scissors size={20} />
        </span>
        <h3 className="mt-5 line-clamp-2 min-h-14 text-xl font-semibold">{service.name}</h3>
        <p className="text-sm font-medium text-[var(--landing-gold-soft)]">{service.durationMinutes} {t("minutos", "minutes")}</p>
        <p className="mt-3 line-clamp-3 min-h-[4.5rem] overflow-hidden text-sm leading-relaxed">{service.description || t("Servicio profesional de barbería en Iquitos.", "Professional barbering service in Iquitos.")}</p>
      </div>
      <Link href="/reservar" onClick={() => trackEvent("service_click", { service_id: service.id, service_name: service.name })} className="landing-service-card-button mt-auto inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium">
        {t("Reservar", "Book")} <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function ServicesMarquee({ services }: { services: LandingService[] }) {
  const { t } = useLandingLanguage();
  const visibleServices = services.filter((service) => service.branchCode === "SED-002");
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <section id="servicios" className="relative scroll-mt-24 bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <LandingSectionTitle eyebrow={t("Nuestros servicios", "Our services")} title={t("Cortes y barbería premium en Iquitos", "Premium haircuts and barbering in Iquitos")} description={t("Corte clásico, fade, barba, perfilado y servicios personalizados con barberos profesionales en Iquitos.", "Classic cuts, fades, beard grooming, shaping and personalized services by professional barbers in Iquitos.")} />
        </div>

        {visibleServices.length === 0 ? <Placeholder /> : null}
        {visibleServices.length > 0 ? (
          <>
          <div className="mb-4">
            <CarouselNavigation carouselRef={carouselRef} label={t("servicios", "services")} />
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
