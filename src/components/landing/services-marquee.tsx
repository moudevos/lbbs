import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";

type Service = {
  name: string;
  duration: string;
  price: string;
  description: string;
};

const services: Service[] = [
  {
    name: "Corte clásico",
    duration: "30 min",
    price: "S/ 20",
    description: "Corte preciso adaptado a tu estilo y tipo de rostro."
  },
  {
    name: "Corte + barba",
    duration: "45 min",
    price: "S/ 35",
    description: "Combo completo: corte definido y barba perfilada."
  },
  {
    name: "Barba",
    duration: "20 min",
    price: "S/ 15",
    description: "Perfilado, contorno y acabado limpio a navaja."
  },
  {
    name: "Perfilado",
    duration: "20 min",
    price: "S/ 15",
    description: "Líneas marcadas y contornos definidos al detalle."
  },
  {
    name: "Servicio personalizado",
    duration: "A medida",
    price: "Consultar",
    description: "Diseñamos la atención según lo que buscas."
  }
];

function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="flex h-full w-72 shrink-0 flex-col justify-between rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:-translate-y-1">
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-soft)]">
          <Scissors size={20} />
        </span>
        <h3 className="mt-4 text-xl font-semibold text-white">{service.name}</h3>
        <p className="mt-1 text-sm text-[var(--gold-soft)]">
          {service.duration} · {service.price}
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {service.description}
        </p>
      </div>
      <Link
        href="/reservar"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[var(--border-strong)] hover:text-[var(--gold-soft)]"
        aria-label={`Reservar ${service.name}`}
      >
        Reservar <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function ServicesMarquee() {
  return (
    <section id="servicios" className="relative scroll-mt-24 overflow-hidden bg-black py-16 md:py-20">
      <div className="mx-auto mb-12 max-w-7xl px-6">
        <LandingSectionTitle
          eyebrow="Servicios"
          title="Servicios diseñados para tu estilo"
          description="Elige el servicio que necesitas o coordina una atención personalizada con nuestro equipo."
        />
      </div>

      <div className="marquee-pause group flex w-max gap-6 px-6">
        <div
          className="marquee flex w-max gap-6"
          style={{ animationName: "marquee-left", animationDuration: "40s" }}
        >
          {[...services, ...services].map((service, index) => (
            <ServiceCard key={`service-${index}`} service={service} />
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
