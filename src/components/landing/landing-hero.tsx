"use client";

import Link from "next/link";
import { Crimson_Pro } from "next/font/google";
import { ArrowRight, CalendarCheck, CalendarClock, MapPin, Scissors } from "lucide-react";
import { HeroBackgroundCarousel } from "./hero-background-carousel";
import { trackEvent } from "@/lib/analytics/track-event";
import { useLandingLanguage } from "./landing-language-provider";

const crimsonPro = Crimson_Pro({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export function LandingHero() {
  const { t } = useLandingLanguage();
  const highlights = [
    { icon: MapPin, label: "Iquitos, Loreto" },
    { icon: CalendarClock, label: t("Atención por reserva", "Appointment service") },
    { icon: Scissors, label: t("Cortes con identidad", "Signature haircuts") }
  ];

  return (
    <section id="inicio" className="relative min-h-screen overflow-hidden bg-[var(--landing-bg)]">
      <HeroBackgroundCarousel />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-24">
        <div className="max-w-3xl">
          <p className={`${crimsonPro.className} mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-black/25 px-4 py-2 text-sm uppercase tracking-[0.28em] text-[var(--landing-gold-soft)] backdrop-blur`}>{t("Barbería premium en Iquitos", "Premium barbershop in Iquitos")}</p>
          <h1 className={`${crimsonPro.className} text-5xl font-bold leading-[0.98] text-white drop-shadow-2xl sm:text-6xl md:text-7xl lg:text-8xl`}>{t("El estilo se trabaja. La presencia se nota.", "Style is crafted. Presence is noticed.")}</h1>
          <p className={`${crimsonPro.className} mt-6 max-w-2xl text-xl leading-relaxed text-white/82 md:text-2xl`}>{t("Vive una experiencia auténtica de barbería premium en Iquitos, con cortes precisos, trato cercano y estilo propio.", "Enjoy an authentic premium barbershop experience in Iquitos, with precise cuts, personal service and a style of your own.")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/reservar" onClick={() => trackEvent("reserve_click", { location: "hero" })} className="landing-primary-button inline-flex items-center justify-center gap-2 px-6 py-3 text-sm"><CalendarCheck size={16} /> {t("Reservar cita", "Book appointment")}</Link>
            <a href="#servicios" className="landing-secondary-button inline-flex items-center justify-center gap-2 bg-black/20 px-6 py-3 text-sm backdrop-blur">{t("Ver servicios", "View services")} <ArrowRight size={16} /></a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-white/72">
            {highlights.map(({ icon: Icon, label }) => <li key={label} className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-border)] bg-black/25 text-[var(--landing-gold-soft)] backdrop-blur"><Icon size={15} /></span>{label}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
