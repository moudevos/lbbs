"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Scissors } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import { dedupeById } from "@/lib/utils/dedupe-by-id";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
  branchName: string | null;
};

function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="flex h-full w-72 shrink-0 flex-col justify-between rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition-transform duration-300 hover:-translate-y-1">
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-[var(--gold-soft)]">
          <Scissors size={20} />
        </span>
        <h3 className="mt-4 text-xl font-semibold text-white">{service.name}</h3>
        <p className="mt-1 text-sm text-[var(--gold-soft)]">
          {service.durationMinutes} min · {service.price == null ? "Consultar" : `S/ ${Number(service.price).toFixed(2)}`}
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">{service.description || service.branchName || "Servicio profesional La Bajadita."}</p>
      </div>
      <Link href="/reservar" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[var(--border-strong)] hover:text-[var(--gold-soft)]">
        Reservar <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export function ServicesMarquee() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/services")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar servicios");
        setServices(dedupeById<Service>((data.services ?? []) as Service[]));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loop = services.length > 3 ? [...services, ...services] : services;

  return (
    <section id="servicios" className="relative scroll-mt-24 overflow-hidden bg-black py-16 md:py-20">
      <div className="mx-auto mb-12 max-w-7xl px-6">
        <LandingSectionTitle eyebrow="Servicios" title="Servicios diseñados para tu estilo" description="Servicios activos cargados desde el sistema interno." />
      </div>

      {loading ? <SkeletonRow /> : null}
      {!loading && error ? <StateMessage text={error} /> : null}
      {!loading && !error && services.length === 0 ? <StateMessage text="Aun no hay servicios publicados." /> : null}
      {loop.length > 0 ? (
        <div className="marquee-pause group flex w-max gap-6 px-6">
          <div className={`${services.length > 3 ? "marquee" : ""} flex w-max gap-6`} style={services.length > 3 ? { animationName: "marquee-left", animationDuration: "40s" } : undefined}>
            {loop.map((service, index) => <ServiceCard key={`${service.id}-${index}`} service={service} />)}
          </div>
        </div>
      ) : null}

      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent md:w-28" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent md:w-28" />
    </section>
  );
}

function SkeletonRow() {
  return <div className="flex gap-6 px-6">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-72 w-72 shrink-0 animate-pulse rounded-2xl border border-[var(--border-soft)] bg-white/5" />)}</div>;
}

function StateMessage({ text }: { text: string }) {
  return <div className="mx-6 rounded-2xl border border-[var(--border-soft)] bg-black/35 p-6 text-sm text-[var(--text-muted)]">{text}</div>;
}
