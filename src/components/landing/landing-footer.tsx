import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, MapPin, MessageCircle, Music2 } from "lucide-react";
import type { LandingBranch, LandingSettings } from "@/lib/public/landing-data";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Por qué nosotros", href: "#por-que-nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Galería", href: "#trabajo" },
  { label: "Reservar", href: "/reservar", isRoute: true }
];

const serviceLinks = ["Corte clásico", "Corte fade", "Barba", "Perfilado"];

const socialIcons = [
  { matcher: "wa.me", label: "WhatsApp", icon: MessageCircle },
  { matcher: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { matcher: "facebook", label: "Facebook", icon: Facebook },
  { matcher: "instagram", label: "Instagram", icon: Instagram },
  { matcher: "tiktok", label: "TikTok", icon: Music2 }
];

export function LandingFooter({ branches, settings }: { branches: LandingBranch[]; settings: LandingSettings }) {
  const socials = settings.socialLinks
    .filter((href) => /^https?:\/\//.test(href))
    .map((href) => {
      const found = socialIcons.find((item) => href.toLowerCase().includes(item.matcher));
      return { label: found?.label ?? "Red social", href, icon: found?.icon ?? MessageCircle };
    });
  const phones = settings.phones.length ? settings.phones : branches.map((branch) => branch.phone).filter(Boolean) as string[];

  return (
    <footer id="contacto" className="relative scroll-mt-24 overflow-hidden border-t border-[var(--landing-border)] bg-black py-12">
      <div className="absolute inset-0 bg-black bg-[url('/landing/footer/footer-bg.webp')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image src="/landing/logo-bajadita.png" alt="La Bajadita Barber Studio" width={190} height={74} className="h-14 w-auto object-contain" />
          <p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)]">
            La Bajadita Barber Studio es un espacio de barbería premium en Iquitos donde la técnica, la autenticidad y el detalle se unen para crear cortes con identidad.
          </p>
          <p className="mt-4 text-xs font-semibold text-[var(--landing-gold-soft)]">#CristoVive</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]">Navegación</h2>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            {navLinks.map((link) => (
              <li key={link.href}>
                {link.isRoute ? <Link href={link.href} className="transition-colors hover:text-[var(--landing-gold-soft)]">{link.label}</Link> : <a href={link.href} className="transition-colors hover:text-[var(--landing-gold-soft)]">{link.label}</a>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]">Servicios</h2>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            {serviceLinks.map((service) => <li key={service}>{service}</li>)}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]">Sedes y horarios</h2>
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
          <div className="mt-5 flex flex-wrap gap-2">
            {phones[0] ? <a href={`https://wa.me/51${phones[0].replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="landing-secondary-button inline-flex items-center gap-2 px-3 py-2 text-xs" aria-label="Escribir por WhatsApp a La Bajadita Barber Studio"><MessageCircle size={14} /> WhatsApp</a> : null}
            {socials.map(({ label, href, icon: Icon }) => <a key={href} href={href} className="landing-secondary-button inline-flex items-center gap-2 px-3 py-2 text-xs" aria-label={label} target="_blank" rel="noreferrer"><Icon size={14} /> {label}</a>)}
          </div>
        </div>
      </div>

      <div className="relative mt-10 border-t border-[var(--landing-border)] px-6 pt-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-[var(--text-faint)] md:flex-row md:items-center md:justify-between">
          <p>© 2026 La Bajadita Barber Studio. Todos los derechos reservados.</p>
          <p>Desarrollado por MouDevOS</p>
        </div>
      </div>
    </footer>
  );
}
