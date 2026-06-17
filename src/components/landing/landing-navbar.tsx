"use client";

import { useEffect, useState } from "react";
import { Rye } from "next/font/google";
import { Menu, X } from "lucide-react";

const rye = Rye({
  subsets: ["latin"],
  weight: ["400"]
});

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Por qué nosotros", href: "#por-que-nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Galería", href: "#trabajo" },
  { label: "Equipo", href: "#equipo" },
  { label: "Ubicación", href: "#ubicacion" }
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={"fixed left-0 top-0 z-50 w-full px-5 transition-all duration-300 " + (scrolled ? "border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/82 py-3 shadow-lg shadow-black/40 backdrop-blur-xl" : "bg-transparent py-5")}>
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <a href="#inicio" className={`${rye.className} inline-flex rounded-xl px-2 py-1 text-lg tracking-wide text-white transition hover:bg-white/5 hover:text-[var(--landing-gold-soft)]`} aria-label="La Bajadita Barber Studio, ir al inicio">
          La Bajadita
        </a>

        <div className="hidden items-center gap-2 lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/75 transition hover:bg-white/5 hover:text-[var(--landing-gold-soft)] active:bg-white/10">
              {link.label}
            </a>
          ))}
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="text-white transition hover:text-[var(--landing-gold-soft)] lg:hidden" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-bg)]/92 p-4 backdrop-blur-xl lg:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/5 hover:text-[var(--landing-gold-soft)]">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
