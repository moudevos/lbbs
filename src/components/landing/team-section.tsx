"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, MapPin } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingTeamMember } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { useRef } from "react";
import { CarouselNavigation } from "./carousel-navigation";

export function TeamSection({ team }: { team: LandingTeamMember[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);

  return (
    <section id="equipo" className="relative scroll-mt-24 bg-[#071013] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <LandingSectionTitle eyebrow="Nuestro equipo" title="Barberos en Iquitos" description="Conoce a los barberos de La Bajadita: especialidades, apodos y sedes para reservar tu corte." />
        </div>

        {team.length === 0 ? <Message text="Nuestro equipo estará disponible pronto. Reserva tu cita y te asignaremos un especialista según tu servicio." /> : null}
        {team.length > 0 ? (
          <>
          <div className="mb-4">
            <CarouselNavigation carouselRef={carouselRef} label="barberos" />
          </div>
          <div ref={carouselRef} className="no-scrollbar -mx-6 flex snap-x gap-5 overflow-x-auto overflow-y-hidden px-6 pb-3 lg:mx-0 lg:px-0">
            {team.map((member) => (
              <article data-carousel-card key={member.id} className="group flex min-w-[82vw] max-w-[82vw] snap-start flex-col overflow-hidden rounded-[1.75rem] border border-[var(--landing-border)] bg-[var(--landing-panel)]/78 transition-all duration-300 hover:border-[var(--border-strong)] sm:min-w-80 sm:max-w-80 lg:min-w-[calc((100%_-_2.5rem)/3)] lg:max-w-[calc((100%_-_2.5rem)/3)]">
                <div className="px-6 pb-4 pt-6 text-center">
                  <h3 className="text-2xl font-semibold text-white">{shortName(member.firstName, member.lastName)}</h3>
                  <p className={`mt-1 min-h-5 text-sm font-medium text-[var(--landing-gold-soft)] ${member.nickname ? "" : "invisible"}`} aria-hidden={!member.nickname}>
                    {member.nickname || "Sin apodo"}
                  </p>
                </div>
                <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_25%,_rgba(212,175,55,0.25),_transparent_60%),linear-gradient(160deg,#1c1c1c,#070707)]">
                  <TeamPhoto member={member} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-6 text-center">
                  <p className="mt-3 text-sm text-[var(--gold-soft)]">{member.specialty}</p>
                  <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--text-faint)]"><MapPin size={14} className="text-[var(--gold-soft)]" /> {member.branchName ?? "La Bajadita Barber Studio"}</p>
                  <Link href="/reservar" onClick={() => trackEvent("team_barber_reserve_click", { barber_id: member.id, barber_name: member.nickname || member.fullName })} className="landing-secondary-button mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium">
                    <CalendarCheck size={15} /> Reservar con este barbero
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function shortName(firstName: string, lastName: string) {
  const first = firstName.trim().split(/\s+/)[0] ?? "";
  const last = lastName.trim().split(/\s+/)[0] ?? "";
  return `${first} ${last}`.trim() || "Barbero profesional";
}

function TeamPhoto({ member }: { member: LandingTeamMember }) {
  const name = member.nickname || member.fullName;
  if (!member.profilePhotoUrl) return <AvatarFallback name={name} />;

  return (
    <Image
      src={member.profilePhotoUrl}
      alt={`${name}, barbero en Iquitos en La Bajadita Barber Studio`}
      fill
      loading="lazy"
      sizes="320px"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LB";
  return (
    <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.28),transparent_58%)] text-4xl font-semibold text-[var(--gold-soft)]">
      <div className="grid h-24 w-24 place-items-center rounded-full border border-[var(--gold-soft)] bg-black/40">{initials}</div>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-6 text-sm text-[var(--text-muted)]">{text}</div>;
}
