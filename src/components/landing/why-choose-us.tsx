"use client";

import { Armchair, Clock, Scissors, Sparkles } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import { useLandingLanguage } from "./landing-language-provider";

export function WhyChooseUs() {
  const { t } = useLandingLanguage();
  const reasons = [
    { title: t("Barberos con detalle", "Detail-focused barbers"), text: t("Profesionales enfocados en precisión, acabado y trato cercano.", "Professionals focused on precision, finish and personal service."), icon: Scissors },
    { title: t("Productos premium", "Premium products"), text: t("Usamos productos seleccionados para cuidar tu cabello y barba.", "We use selected products to care for your hair and beard."), icon: Sparkles },
    { title: t("Ambiente relajado", "Relaxed atmosphere"), text: t("Un espacio cómodo, moderno y pensado para disfrutar tu atención.", "A comfortable, modern space designed for you to enjoy your visit."), icon: Armchair },
    { title: t("Puntualidad", "Punctuality"), text: t("Reservas organizadas para respetar tu tiempo.", "Organized appointments that respect your time."), icon: Clock }
  ];
  return (
    <section id="por-que-nosotros" className="bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <LandingSectionTitle eyebrow={t("Por qué nosotros", "Why us")} title={t("¿Por qué elegirnos?", "Why choose us?")} description={t("Cuidamos tu imagen con técnica, puntualidad y una experiencia pensada para que vuelvas.", "We care for your image with technique, punctuality and an experience designed to bring you back.")} />
        <div className="mt-10 grid overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/70 md:grid-cols-4">
          {reasons.map(({ title, text, icon: Icon }, index) => <article key={title} className={`p-6 ${index > 0 ? "border-t border-[var(--landing-border)] md:border-l md:border-t-0" : ""}`}><Icon className="text-[var(--landing-gold-soft)]" size={26} /><h3 className="mt-5 text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{text}</p></article>)}
        </div>
      </div>
    </section>
  );
}
