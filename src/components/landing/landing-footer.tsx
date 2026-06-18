"use client";

import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, MapPin, MessageCircle, Music2 } from "lucide-react";
import type { LandingBranch, LandingSettings } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { resolvePublicSocialLinks } from "@/lib/public/social-links";
import { useLandingLanguage } from "./landing-language-provider";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Por qué nosotros", href: "#por-que-nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Galería", href: "#trabajo" },
  { label: "Reservar", href: "/reservar", isRoute: true }
];

const serviceLinks = ["Corte clásico", "Corte fade", "Barba", "Perfilado"];

export function LandingFooter({ branches, settings, mainPhone }: { branches: LandingBranch[]; settings: LandingSettings; mainPhone: string | null }) {
  const { t } = useLandingLanguage();
  const digits = mainPhone?.replace(/\D/g, "") ?? "";
  const resolved = resolvePublicSocialLinks(settings.socialLinks, digits ? `https://wa.me/${digits.startsWith("51") ? digits : `51${digits}`}` : "");
  const socials = [
    { label: "Instagram", href: resolved.instagram, icon: Instagram },
    { label: "TikTok", href: resolved.tiktok, icon: Music2 },
    { label: "Facebook", href: resolved.facebook, icon: Facebook },
    { label: "WhatsApp", href: resolved.whatsapp, icon: MessageCircle }
  ].filter((item) => item.href);

  return (
    <footer id="contacto" className="relative scroll-mt-24 overflow-hidden border-t border-[var(--landing-border)] py-12">
      <div className="absolute inset-0 bg-[url('/landing/footer/footer-bg.webp')] bg-cover bg-center bg-no-repeat md:bg-fixed" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/landing/logo-bajadita.png" alt="La Bajadita Barber Studio" width={190} height={74} className="h-14 w-auto object-contain" />
          <p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)]">
            {t("La Bajadita Barber Studio es un espacio de barbería premium en Iquitos donde la técnica, la autenticidad y el detalle se unen para crear cortes con identidad.", "La Bajadita Barber Studio is a premium barbershop in Iquitos where technique, authenticity and detail come together to create signature haircuts.")}
          </p>
          <p className="mt-4 text-xs font-semibold text-[var(--landing-gold-soft)]">#CristoVive</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]">{t("Navegación", "Navigation")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            {navLinks.map((link) => (
              <li key={link.href}>
                {link.isRoute ? <Link href={link.href} className="transition-colors hover:text-[var(--landing-gold-soft)]">{footerNavLabel(link.href, t)}</Link> : <a href={link.href} className="transition-colors hover:text-[var(--landing-gold-soft)]">{footerNavLabel(link.href, t)}</a>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]">{t("Servicios", "Services")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            {serviceLinks.map((service) => <li key={service}>{footerServiceLabel(service, t)}</li>)}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]">{t("Sedes y horarios", "Locations and hours")}</h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
            {branches.length ? branches.map((branch) => (
              <li key={branch.id} className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--landing-gold-soft)]" />
                <span>
                  <strong className="text-white/80">{branch.name}</strong>
                  {branch.address ? <span className="block text-xs">{branch.address}</span> : null}
                  {branch.phone ? <span className="block text-xs">WhatsApp: {branch.phone}</span> : null}
                </span>
              </li>
            )) : <li>Direcciones y horarios personalizables desde el panel de administración.</li>}
          </ul>
          <div className="mt-5 flex items-center gap-3">
            {socials.map(({ label, href, icon: Icon }) => <a key={label} href={href} onClick={() => trackEvent(label === "WhatsApp" ? "whatsapp_click" : "social_click", { network: label, location: "footer" })} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--landing-border)] bg-black/30 text-[var(--landing-gold-soft)] transition hover:border-[var(--landing-gold-soft)] hover:bg-black/55" aria-label={label} target="_blank" rel="noreferrer"><Icon size={16} /></a>)}
          </div>
        </div>
      </div>

      <div className="relative mt-10 border-t border-[var(--landing-border)] px-6 pt-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-[var(--text-faint)] md:flex-row md:items-center md:justify-between">
          <p>© 2026 La Bajadita Barber Studio. {t("Todos los derechos reservados.", "All rights reserved.")}</p>
          <p>{t("Desarrollado por MouDevOS", "Developed by MouDevOS")}</p>
        </div>
      </div>
    </footer>
  );
}

function footerNavLabel(href: string, t: (spanish: string, english: string) => string) {
  const labels: Record<string, [string, string]> = {
    "#inicio": ["Inicio", "Home"],
    "#por-que-nosotros": ["Por qué nosotros", "Why us"],
    "#servicios": ["Servicios", "Services"],
    "#trabajo": ["Galería", "Gallery"],
    "/reservar": ["Reservar", "Book"]
  };
  const label = labels[href] ?? [href, href];
  return t(label[0], label[1]);
}

function footerServiceLabel(service: string, t: (spanish: string, english: string) => string) {
  const labels: Record<string, string> = {
    "Corte clásico": "Classic haircut",
    "Corte fade": "Fade haircut",
    Barba: "Beard grooming",
    Perfilado: "Shaping"
  };
  return t(service, labels[service] ?? service);
}
