import Link from "next/link";
import { ArrowRight, Scissors, MapPin, Clock3, Sparkles } from "lucide-react";

const services = [
  { name: "Corte clásico", meta: "30 min · S/ 20" },
  { name: "Corte + barba", meta: "45 min · S/ 35" },
  { name: "Barba", meta: "20 min · S/ 15" },
  { name: "Perfilado", meta: "20 min · S/ 15" }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between rounded-full gold-border bg-black/40 px-5 py-3 text-sm text-[var(--text-muted)]">
          <span>La Bajadita Barber Shop</span>
          <Link className="text-[var(--gold)]" href="/reservar">Reservar ahora</Link>
        </div>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[rgba(212,175,55,0.12)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--gold-soft)]">
              <Sparkles size={14} /> Premium barber shop
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white md:text-7xl">
              Una experiencia de barbería seria, rápida y elegante.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--text-muted)]">
              Reserva online, agenda por barbero y control interno con roles, sedes, pagos y auditoría.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/reservar" className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 font-medium text-black">
                Reservar cita <ArrowRight size={18} />
              </Link>
              <a href="#servicios" className="inline-flex items-center gap-2 rounded-full gold-border px-6 py-3 text-white">
                Ver servicios
              </a>
            </div>
          </div>

          <div className="glass-panel gold-border rounded-3xl p-6">
            <div className="aspect-[4/5] rounded-2xl border border-[var(--border-soft)] bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.35),_transparent_55%),linear-gradient(180deg,#1b1b1b,#0b0b0b)] p-6">
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gold)] text-black">
                    <Scissors size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Sello premium</p>
                    <p className="text-xl font-semibold">La Bajadita</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-[var(--text-muted)]">
                  <div className="flex items-center gap-3"><MapPin size={16} /> Sede 1 · Sede 2</div>
                  <div className="flex items-center gap-3"><Clock3 size={16} /> Agenda flexible por duración real</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="servicios" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.name} className="glass-panel gold-border rounded-2xl p-5">
              <p className="text-lg font-semibold text-white">{service.name}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{service.meta}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
