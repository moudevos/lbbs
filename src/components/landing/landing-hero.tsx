import Link from "next/link";
import { Rye, Crimson_Pro } from "next/font/google";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  MapPin,
  Scissors
} from "lucide-react";
import { HeroBackgroundCarousel } from "./hero-background-carousel";

const rye = Rye({
  subsets: ["latin"],
  weight: ["400"]
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600"]
});

const highlights = [
  { icon: MapPin, label: "2 sedes" },
  { icon: CalendarClock, label: "Atención por reserva" },
  { icon: Scissors, label: "Servicios personalizados" }
];

export function LandingHero() {
  return (
    <section id="inicio" className="relative min-h-screen overflow-hidden bg-black">
      {/* Carrusel de fondo a pantalla completa */}
      <HeroBackgroundCarousel />

      {/* Contenido sobre la imagen */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-24">
        <div className="max-w-2xl">
          <p
            className={`${crimsonPro.className} mb-4 inline-flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-[var(--gold-soft)]`}
          >
            Barbería premium en Iquitos
          </p>

          <h1
            className={`${rye.className} text-5xl leading-[1.1] text-white drop-shadow-2xl sm:text-6xl md:text-7xl lg:text-8xl`}
          >
            La Bajadita Barber Studio
          </h1>

          <p
            className={`${crimsonPro.className} mt-6 max-w-xl text-xl text-white/80 md:text-2xl`}
          >
            Ven y vive la experiencia de la barbería premium en Iquitos
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/reservar"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5"
              aria-label="Reservar ahora"
            >
              <CalendarCheck size={16} /> Reservar ahora
            </Link>

            <a
              href="#servicios"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-black/20 px-6 py-3 text-sm text-white backdrop-blur transition-colors hover:border-[var(--gold-soft)]"
            >
              Ver servicios <ArrowRight size={16} />
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-white/70">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-black/25 text-[var(--gold-soft)] backdrop-blur">
                  <Icon size={15} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
