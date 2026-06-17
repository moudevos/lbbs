import { Star } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";

type Testimonial = {
  name: string;
  comment: string;
  rating: number;
  service: string;
  branch?: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Carlos M.",
    comment: "Excelente atención, corte limpio y rápido.",
    rating: 5,
    service: "Corte clásico",
    branch: "Sede 1"
  },
  {
    name: "Luis R.",
    comment: "Muy buena coordinación por WhatsApp.",
    rating: 5,
    service: "Corte + barba",
    branch: "Sede 2"
  },
  {
    name: "Jean P.",
    comment: "El acabado quedó preciso, recomendado.",
    rating: 5,
    service: "Perfilado"
  },
  {
    name: "Miguel A.",
    comment: "Ambiente cómodo y atención profesional.",
    rating: 5,
    service: "Barba",
    branch: "Sede 1"
  }
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`Calificación ${rating} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={16}
          aria-hidden
          className={
            index < rating
              ? "fill-[var(--gold)] text-[var(--gold)]"
              : "text-[var(--text-faint)]"
          }
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="flex h-full w-80 shrink-0 flex-col justify-between rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <div>
        <Stars rating={testimonial.rating} />
        <p className="mt-4 text-base leading-relaxed text-[var(--text-main)]">
          “{testimonial.comment}”
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
        <span className="text-sm font-semibold text-white">{testimonial.name}</span>
        <span className="text-xs text-[var(--text-muted)]">
          {testimonial.service}
          {testimonial.branch ? ` · ${testimonial.branch}` : ""}
        </span>
      </div>
    </article>
  );
}

export function TestimonialsMarquee() {
  return (
    <section id="comentarios" className="relative scroll-mt-24 overflow-hidden bg-black py-16 md:py-20">
      <div className="mx-auto mb-12 max-w-7xl px-6">
        <LandingSectionTitle
          eyebrow="Comentarios"
          title="Lo que dicen nuestros clientes"
          description="Experiencias reales de quienes ya pasaron por La Bajadita Barber Shop."
        />
      </div>

      <div className="marquee-pause flex w-max gap-6 px-6">
        <div
          className="marquee flex w-max gap-6"
          style={{ animationName: "marquee-right", animationDuration: "46s" }}
        >
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <TestimonialCard key={`testimonial-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent md:w-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent md:w-28"
      />
    </section>
  );
}
