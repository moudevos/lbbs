import { Armchair, Clock, Scissors, Sparkles } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";

const reasons = [
  { title: "Barberos con detalle", text: "Profesionales enfocados en precisión, acabado y trato cercano.", icon: Scissors },
  { title: "Productos premium", text: "Usamos productos seleccionados para cuidar tu cabello y barba.", icon: Sparkles },
  { title: "Ambiente relajado", text: "Un espacio cómodo, moderno y pensado para disfrutar tu atención.", icon: Armchair },
  { title: "Puntualidad", text: "Reservas organizadas para respetar tu tiempo.", icon: Clock }
];

export function WhyChooseUs() {
  return (
    <section id="por-que-nosotros" className="bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <LandingSectionTitle eyebrow="Por qué nosotros" title="¿Por qué elegirnos?" description="Cuidamos tu imagen con técnica, puntualidad y una experiencia pensada para que vuelvas." />
        <div className="mt-10 grid overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/70 md:grid-cols-4">
          {reasons.map(({ title, text, icon: Icon }, index) => (
            <article key={title} className={`p-6 ${index > 0 ? "border-t border-[var(--landing-border)] md:border-l md:border-t-0" : ""}`}>
              <Icon className="text-[var(--landing-gold-soft)]" size={26} />
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
