/*  */"use client";

import { useEffect, useState } from "react";
import { Rye } from "next/font/google";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { LanguageSelector, useLandingLanguage } from "./landing-language-provider";

const rye = Rye({ subsets: ["latin"], weight: ["400"] });

export function LandingNavbar() {
  const { t } = useLandingLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navLinks = [
    { label: t("Inicio", "Home"), href: "#inicio" },
    { label: t("Por qué nosotros", "Why us"), href: "#por-que-nosotros" },
    { label: t("Servicios", "Services"), href: "#servicios" },
    { label: t("Galería", "Gallery"), href: "#trabajo" },
    { label: t("Equipo", "Team"), href: "#equipo" },
    { label: t("Ubicación", "Location"), href: "#ubicacion" }
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={"fixed left-0 top-0 z-50 w-full px-5 transition-all duration-300 " + (scrolled ? "border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/82 py-3 shadow-lg shadow-black/40 backdrop-blur-xl" : "bg-transparent py-5")}>
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <a href="#inicio" className={`${rye.className} inline-flex rounded-xl px-2 py-1 text-lg tracking-wide text-white transition hover:bg-white/5 hover:text-[var(--landing-gold-soft)]`}>La Bajadita</a>
        <div className="hidden items-center gap-2 lg:flex">
          {navLinks.map((link) => <a key={link.href} href={link.href} className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/75 transition hover:bg-white/5 hover:text-[var(--landing-gold-soft)]">{link.label}</a>)}
          <LanguageSelector />
          <Link href="/reservar" className="ml-1 rounded-full bg-[var(--landing-gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:bg-[var(--landing-gold-soft)]">{t("Reservar ya", "Book now")}</Link>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSelector />
          <button type="button" onClick={() => setOpen((value) => !value)} className="text-white transition hover:text-[var(--landing-gold-soft)]" aria-label={open ? t("Cerrar menú", "Close menu") : t("Abrir menú", "Open menu")}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </div>
      {open ? <div className="mt-4 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-bg)]/92 p-4 backdrop-blur-xl lg:hidden"><ul>{navLinks.map((link) => <li key={link.href}><a href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm uppercase tracking-[0.18em] text-white/80">{link.label}</a></li>)}</ul><Link href="/reservar" onClick={() => setOpen(false)} className="mt-3 flex w-full items-center justify-center rounded-full bg-[var(--landing-gold)] px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black">{t("Reservar ya", "Book now")}</Link></div> : null}
    </nav>
  );
}
