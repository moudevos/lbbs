"use client";

import { useState } from "react";
import Image from "next/image";
import { LandingSectionTitle } from "./landing-section-title";
import { WorkDetailModal, type WorkItem } from "./work-detail-modal";

const workItems: WorkItem[] = [
  {
    id: "work-1",
    title: "El gran equipo",
    barber: "Equipo La Bajadita",
    service: "Elegancia",
    detail: "",
    image: "/landing/work/work-1.jpg",
    className: "lg:col-span-8 lg:row-span-3"
  },
  {
    id: "work-2",
    title: "Perfilado definido",
    barber: "Equipo La Bajadita",
    service: "Perfilado",
    detail: "Contornos precisos y acabado profesional.",
    image: "/landing/work/work-2.jpg",
    className: "lg:col-span-4 lg:row-span-2"
  },
  {
    id: "work-5",
    title: "Perfilado definido",
    barber: "Equipo La Bajadita",
    service: "Perfilado",
    detail: "Contornos precisos y acabado profesional.",
    image: "/landing/work/work-5.jpg",
    className: "lg:col-span-4 lg:row-span-4"
  },
  {
    id: "work-3",
    title: "Perfilado definido",
    barber: "Equipo La Bajadita",
    service: "Perfilado",
    detail: "Contornos precisos y acabado profesional.",
    image: "/landing/work/work-3.jpg",
    className: "lg:col-span-4 lg:row-span-3"
  },
  {
    id: "work-4",
    title: "Perfilado definido",
    barber: "Equipo La Bajadita",
    service: "Perfilado",
    detail: "Contornos precisos y acabado profesional.",
    image: "/landing/work/work-4.jpg",
    className: "lg:col-span-4 lg:row-span-3"
  },
  
];

// Alturas variables para el flujo en móvil (1 columna)
const mobileHeights = [
  "min-h-[300px]",
  "min-h-[220px]",
  "min-h-[260px]",
  "min-h-[300px]",
  "min-h-[220px]",
  "min-h-[240px]",
  "min-h-[280px]",
  "min-h-[300px]"
];

export function WorkCollage() {
  const [selected, setSelected] = useState<WorkItem | null>(null);

  return (
    <section id="trabajo" className="relative scroll-mt-24 overflow-hidden bg-[#050505] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-3xl">
          <LandingSectionTitle
            align="left"
            eyebrow="Nuestro trabajo"
            title="Cortes que hablan por ti"
            description="Cada acabado refleja precisión, estilo y la experiencia de una barbería premium en Iquitos."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-6 lg:h-[760px] lg:grid-cols-12 lg:grid-rows-6">
          {workItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              aria-label={`Ver ${item.title}, por ${item.barber}`}
              className={`group relative overflow-hidden rounded-[1.4rem] bg-[#111] text-left transition duration-300 hover:z-10 lg:min-h-0 ${mobileHeights[index]} ${item.className}`}
            >
              {/* Fondo de respaldo si la imagen no existe */}
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,_rgba(212,175,55,0.18),_transparent_60%),linear-gradient(160deg,#1c1c1c,#070707)]"
              />
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              {/* Overlay + texto solo al hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="absolute inset-x-4 bottom-4 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="text-base font-semibold text-white">{item.title}</p>
                <span className="text-xs text-[var(--gold-soft)]">
                  {item.service} · {item.barber}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <WorkDetailModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
