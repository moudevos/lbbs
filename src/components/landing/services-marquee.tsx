"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Palette,
  Scissors,
  ShoppingBag,
  Smile,
  Sparkles,
  UserRound,
  WandSparkles
} from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingService } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { useLandingLanguage } from "./landing-language-provider";
import { useRef } from "react";
import { CarouselNavigation } from "./carousel-navigation";

function serviceIcon(name: string) {
  const normalized = name.toLocaleLowerCase("es");
  if (/(barba|perfilado)/.test(normalized)) return UserRound;
  if (/(facial|limpieza|mascarilla)/.test(normalized)) return Sparkles;
  if (/(color|tinte|platinado|mecha)/.test(normalized)) return Palette;
  if (/(alisado|cabello|peinado)/.test(normalized)) return WandSparkles;
  if (/(niñ|nino|niño)/.test(normalized)) return Smile;
  if (/(producto|shampoo|cera|gel)/.test(normalized)) return ShoppingBag;
  return Scissors;
}

function ServiceCard({ service }: { service: LandingService }) {
  const { t } = useLandingLanguage();
  const Icon = serviceIcon(service.name);
  const duration = service.durationMinutes
    ? `${service.durationMinutes} ${t("minutos", "minutes")}`
    : t("Duración variable", "Variable duration");

  return (
    <article className="group flex min-h-72 flex-col rounded-2xl border border-[rgba(244,171,73,0.22)] bg-[rgba(255,255,255,0.035)] p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-[rgba(244,171,73,0.65)] hover:bg-[rgba(244,171,73,0.055)]">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(244,171,73,0.25)] bg-[rgba(244,171,73,0.07)] text-[var(--landing-gold-soft)] transition group-hover:border-[rgba(244,171,73,0.5)]">
        <Icon size={30} strokeWidth={1.45} />
      </span>
      <h3 className="mt-5 line-clamp-2 text-lg font-semibold text-white">{service.name}</h3>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
        {service.description || t("Servicio profesional con acabado premium.", "Professional service with a premium finish.")}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--landing-gold-soft)]">
        <Clock3 size={15} /> {duration}
      </div>
      <Link
        href="/reservar"
        onClick={() => trackEvent("service_click", { service_id: service.id, service_name: service.name })}
        className="mt-auto inline-flex items-center justify-center gap-2 pt-5 text-sm font-semibold text-[var(--landing-gold-soft)] transition hover:text-white"
      >
        {t("Reservar", "Book")} <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function ServicesMarquee({ services }: { services: LandingService[] }) {
  const { t } = useLandingLanguage();
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <section id="servicios" className="relative scroll-mt-24 bg-[var(--landing-bg)] py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-10 max-w-4xl">
          <LandingSectionTitle
            eyebrow={t("Nuestros servicios", "Our services")}
            title={t("Cortes y barbería premium en Iquitos", "Premium haircuts and barbering in Iquitos")}
            description={t(
              "Corte clásico, fade, barba, perfilado y servicios personalizados con barberos profesionales en Iquitos.",
              "Classic cuts, fades, beard grooming, shaping and personalized services by professional barbers in Iquitos."
            )}
          />
        </div>

        {services.length === 0 ? <Placeholder /> : (
          <>
            <div className="mb-4 hidden justify-end md:flex">
              <CarouselNavigation carouselRef={carouselRef} label={t("servicios", "services")} />
            </div>
            <div ref={carouselRef} className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 md:mx-0 md:px-0">
              {services.map((service) => <div data-carousel-card key={service.id} className="min-w-[84vw] max-w-[84vw] snap-start sm:min-w-[340px] sm:max-w-[340px] lg:min-w-[calc((100%_-_3rem)/4)] lg:max-w-[calc((100%_-_3rem)/4)]"><ServiceCard service={service} /></div>)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Placeholder() {
  const { t } = useLandingLanguage();
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/55 p-8 text-center">
      <Scissors className="mx-auto text-[var(--landing-gold-soft)]" size={30} />
      <p className="mt-4 font-semibold text-white">{t("No hay servicios disponibles por ahora.", "No services are currently available.")}</p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t("Puede escribirnos por WhatsApp para coordinar su atención.", "You can contact us on WhatsApp to arrange your visit.")}</p>
    </div>
  );
}
