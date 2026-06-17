import Link from "next/link";
import {
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Scissors
} from "lucide-react";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nuestro trabajo", href: "#trabajo" },
  { label: "Servicios", href: "#servicios" },
  { label: "Comentarios", href: "#comentarios" },
  { label: "Reservar", href: "/reservar", isRoute: true }
];

const socials = [
  { label: "WhatsApp", href: "#", icon: MessageCircle },
  { label: "Facebook", href: "#", icon: Facebook },
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "TikTok", href: "#", icon: Music2 }
];

export function LandingFooter() {
  return (
    <footer
      id="contacto"
      className="scroll-mt-24 border-t border-[var(--border-soft)] bg-[#050505] pt-14 pb-8"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Marca */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gold)] text-black">
              <Scissors size={18} />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold text-white">
                La Bajadita
              </span>
              <span className="block text-[0.6rem] uppercase tracking-[0.35em] text-[var(--gold-soft)]">
                Barber Shop
              </span>
            </span>
          </div>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Barbería premium en Iquitos. Estilo, precisión y presencia en cada
            corte.
          </p>
        </div>

        {/* Navegación */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold-soft)]">
            Navegación
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            {navLinks.map((link) =>
              link.isRoute ? (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-[var(--gold-soft)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ) : (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="transition-colors hover:text-[var(--gold-soft)]"
                  >
                    {link.label}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Sedes */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold-soft)]">
            Sedes
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <MapPin size={15} className="text-[var(--gold-soft)]" /> Sede 1
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={15} className="text-[var(--gold-soft)]" /> Sede 2
            </li>
            <li className="text-xs text-[var(--text-faint)]">
              Direcciones personalizables desde configuración.
            </li>
          </ul>
        </div>

        {/* Contacto y redes */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold-soft)]">
            Contacto y redes
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            {socials.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  className="inline-flex items-center gap-2 transition-colors hover:text-[var(--gold-soft)]"
                  aria-label={label}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--gold-soft)]">
                    <Icon size={15} />
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--border-soft)] px-6 py-6">
        <p className="mx-auto max-w-6xl text-center text-xs text-[var(--text-faint)]">
          © 2026 La Bajadita Barber Shop. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
