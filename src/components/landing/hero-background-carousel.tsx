"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CSSProperties } from "react";

type HeroSlide = {
  id: string;
  image: string;
  alt: string;
  objectPosition: string;
  mobileObjectPosition: string;
};

const heroSlides: HeroSlide[] = [
  { id: "hero-1", image: "/landing/hero/hero-1.png", alt: "Barbero atendiendo a un cliente en La Bajadita Barber Studio", objectPosition: "center", mobileObjectPosition: "82% center" },
  { id: "hero-2", image: "/landing/hero/hero-2.png", alt: "Equipo de barberos de La Bajadita Barber Studio en Iquitos", objectPosition: "center", mobileObjectPosition: "78% center" },
  { id: "hero-3", image: "/landing/hero/hero-3.png", alt: "Barbero realizando un corte premium en Iquitos", objectPosition: "center", mobileObjectPosition: "84% center" },
  { id: "hero-4", image: "/landing/hero/hero-4.png", alt: "Servicio de barbería premium en La Bajadita Barber Studio", objectPosition: "center", mobileObjectPosition: "86% center" }
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
    <div className="absolute inset-0 bg-black" onMouseEnter={() => { pausedRef.current = true; }} onMouseLeave={() => { pausedRef.current = false; }}>
      {heroSlides.map((slide, index) => (
        <div key={slide.id} aria-hidden={activeIndex !== index} className={"absolute inset-0 transition-all duration-[1200ms] ease-out " + (activeIndex === index ? "opacity-100 scale-100" : "opacity-0 scale-105")}>
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={index === 0}
            loading={index === 0 ? undefined : "lazy"}
            quality={index === 0 ? 82 : 70}
            sizes="100vw"
            className="landing-hero-image object-cover"
            style={{
              "--desktop-object-position": slide.objectPosition,
              "--mobile-object-position": slide.mobileObjectPosition
            } as CSSProperties}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/38 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--landing-bg)]/72 via-transparent to-transparent" />
      <div aria-hidden className="absolute left-0 top-1/3 h-80 w-80 rounded-full bg-[rgba(234,157,77,0.1)] blur-3xl" />

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroSlides.map((slide, index) => (
          <button key={slide.id} type="button" aria-label={`Ver imagen ${index + 1}`} aria-current={activeIndex === index} onClick={() => setActiveIndex(index)} className={"h-1.5 rounded-full transition-all " + (activeIndex === index ? "w-8 bg-[var(--landing-gold)]" : "w-3 bg-white/35 hover:bg-white/60")} />
        ))}
      </div>
    </div>
  );
}
