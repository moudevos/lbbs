"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type HeroSlide = {
  id: string;
  image: string;
  alt: string;
  objectPosition?: string;
};

const heroSlides: HeroSlide[] = [
  {
    id: "hero-1",
    image: "/landing/hero/hero-1.png",
    alt: "Barbero realizando un servicio en La Bajadita Barber Shop",
    objectPosition: "center"
  },
  {
    id: "hero-2",
    image: "/landing/hero/hero-2.png",
    alt: "Interior premium de La Bajadita Barber Shop",
    objectPosition: "center"
  },
  {
    id: "hero-3",
    image: "/landing/hero/hero-3.png",
    alt: "Cliente recibiendo atención profesional",
    objectPosition: "center"
  },
  {
    id: "hero-4",
    image: "/landing/hero/hero-4.png",
    alt: "Ambiente moderno de barbería",
    objectPosition: "center"
  }
];

const INTERVAL = 6000;

export function HeroBackgroundCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setActiveIndex((prev) => (prev + 1) % heroSlides.length);
    }, INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {/* Respaldo si las imágenes no existen */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(212,175,55,0.12),_transparent_55%),linear-gradient(160deg,#111,#050505)]"
      />

      {heroSlides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={activeIndex !== index}
          className={
            "absolute inset-0 transition-all duration-[1200ms] ease-out " +
            (activeIndex === index
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105")
          }
        >
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: slide.objectPosition ?? "center" }}
          />
        </div>
      ))}

      {/* Overlays suaves para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      {/* Glow dorado suave */}
      <div
        aria-hidden
        className="absolute left-0 top-1/3 h-80 w-80 rounded-full bg-[rgba(212,175,55,0.08)] blur-3xl"
      />

      {/* Indicadores */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Ver imagen ${index + 1}`}
            aria-current={activeIndex === index}
            onClick={() => setActiveIndex(index)}
            className={
              "h-1.5 rounded-full transition-all " +
              (activeIndex === index
                ? "w-8 bg-[var(--gold)]"
                : "w-3 bg-white/35 hover:bg-white/60")
            }
          />
        ))}
      </div>
    </div>
  );
}
