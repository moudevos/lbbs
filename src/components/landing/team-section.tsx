"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck, MapPin, UserRound } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";

type TeamMember = {
  id: string;
  nickname: string | null;
  fullName: string;
  specialty: string;
  branchName: string | null;
  profilePhotoUrl: string | null;
};

export function TeamSection() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/team")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar equipo");
        setTeam(data.team ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="equipo" className="relative scroll-mt-24 bg-[#080808] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <LandingSectionTitle eyebrow="Nuestro equipo" title="Barberos La Bajadita" description="Apodos, especialidades y sedes administrados desde el dashboard." />
        </div>

        {loading ? <div className="flex gap-6 overflow-hidden">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-96 min-w-80 animate-pulse rounded-[1.75rem] border border-[var(--border-soft)] bg-white/5" />)}</div> : null}
        {!loading && error ? <Message text={error} /> : null}
        {!loading && !error && team.length === 0 ? <Message text="Aun no hay barberos publicados." /> : null}
        {team.length > 0 ? (
          <div className="flex gap-6 overflow-x-auto pb-3">
            {team.map((member) => (
              <article key={member.id} className="group flex min-w-80 max-w-80 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] transition-all duration-300 hover:border-[var(--border-strong)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_25%,_rgba(212,175,55,0.25),_transparent_60%),linear-gradient(160deg,#1c1c1c,#070707)]">
                  <TeamPhoto member={member} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl font-semibold text-white">{member.nickname || member.fullName}</h3>
                  {member.nickname ? <p className="mt-1 text-sm text-[var(--text-muted)]">{member.fullName}</p> : null}
                  <p className="mt-3 text-sm text-[var(--gold-soft)]">{member.specialty}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-faint)]"><MapPin size={14} className="text-[var(--gold-soft)]" /> {member.branchName ?? "La Bajadita"}</p>
                  <Link href="/reservar" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-soft)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-[var(--border-strong)] hover:text-[var(--gold-soft)]">
                    <CalendarCheck size={15} /> Reservar con este barbero
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TeamPhoto({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false);
  const name = member.nickname || member.fullName;

  if (!member.profilePhotoUrl || failed) return <AvatarFallback name={name} />;

  return (
    <Image
      src={member.profilePhotoUrl}
      alt={name}
      fill
      sizes="320px"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setFailed(true)}
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
