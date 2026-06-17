import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, MapPin, UserRound } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";

type TeamMember = {
  name: string;
  role: string;
  specialty: string;
  branch: string;
  image: string;
};

const team: TeamMember[] = [
  {
    name: "Equipo La Bajadita",
    role: "Barbería profesional",
    specialty: "Cortes clásicos, fades y servicios personalizados",
    branch: "Sede 1 / Sede 2",
    image: "/landing/team/team-1.jpg"
  },
  {
    name: "Barbero especialista",
    role: "Barbero",
    specialty: "Degradados y perfilado",
    branch: "Sede 1",
    image: "/landing/team/team-2.jpg"
  },
  {
    name: "Atención premium",
    role: "Equipo de atención",
    specialty: "Coordinación por reserva y experiencia del cliente",
    branch: "Sede 2",
    image: "/landing/team/team-3.jpg"
  }
];

export function TeamSection() {
  return (
    <section id="equipo" className="relative scroll-mt-24 bg-[#080808] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <LandingSectionTitle
            eyebrow="Nuestro equipo"
            title="Nuestro equipo"
            description="Barberos que combinan técnica, detalle y trato profesional en cada atención."
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <article
              key={member.name}
              className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[0_24px_60px_-30px_rgba(212,175,55,0.5)]"
            >
              {/* Foto / placeholder premium */}
              <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_30%_25%,_rgba(212,175,55,0.25),_transparent_60%),linear-gradient(160deg,#1c1c1c,#070707)]">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-[var(--gold-soft)] backdrop-blur"
                >
                  <UserRound size={16} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                <p className="mt-1 text-sm text-[var(--gold-soft)]">{member.role}</p>
                <p className="mt-3 text-sm text-[var(--text-muted)]">{member.specialty}</p>
                <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-faint)]">
                  <MapPin size={14} className="text-[var(--gold-soft)]" /> {member.branch}
                </p>

                <Link
                  href="/reservar"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[var(--border-strong)] hover:text-[var(--gold-soft)]"
                  aria-label={`Reservar con ${member.name}`}
                >
                  <CalendarCheck size={15} /> Reservar con este barbero
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
