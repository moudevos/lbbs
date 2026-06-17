"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nuestro trabajo", href: "#trabajo" },
  { label: "Servicios", href: "#servicios" },
  { label: "Nuestro equipo", href: "#equipo" },
  { label: "Comentarios", href: "#comentarios" },
  { label: "Contacto", href: "#contacto" }
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
    <nav
      className={
        "fixed left-0 top-0 z-50 w-full px-6 transition-all duration-300 " +
        (scrolled
          ? "border-b border-[var(--border-soft)] bg-black/65 py-3 shadow-lg shadow-black/40 backdrop-blur-xl"
          : "bg-transparent py-6")
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <a
          href="#inicio"
          className="text-sm uppercase tracking-[0.35em] text-white transition hover:text-[var(--gold-soft)]"
          aria-label="La Bajadita, ir al inicio"
        >
          La Bajadita
        </a>

        {/* Links desktop */}
        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm uppercase tracking-[0.22em] text-white/75 transition hover:text-[var(--gold-soft)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Hamburguesa móvil */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-white transition hover:text-[var(--gold-soft)] lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Panel móvil translúcido */}
      {open ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/85 p-4 backdrop-blur-xl lg:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.22em] text-white/80 transition hover:bg-white/5 hover:text-[var(--gold-soft)]"
                >
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
