"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  CalendarDays,
  Car,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Store
} from "lucide-react";
import { useRef, useState } from "react";
import type { LandingBranch } from "@/lib/public/landing-data";
import { LandingSectionTitle } from "./landing-section-title";
import { useLandingLanguage } from "./landing-language-provider";

function whatsapp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("51") ? digits : `51${digits}`}`;
}

function mapsUrl(address: string | null, branchName: string) {
  const query = address?.trim() || `${branchName}, Iquitos, Loreto, Perú`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function LocationHours({ branches, mainPhone }: { branches: LandingBranch[]; mainPhone: string | null }) {
  const { t } = useLandingLanguage();
  const [activeBranch, setActiveBranch] = useState(branches[0]?.id ?? "");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  function selectBranch(branchId: string) {
    setActiveBranch(branchId);
    cardRefs.current[branchId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const benefits = [
    { icon: Navigation, title: t("Fácil acceso", "Easy access"), text: t("Ubicaciones céntricas y de fácil llegada.", "Central locations that are easy to reach.") },
    { icon: Car, title: t("Estacionamiento", "Parking"), text: t("Opciones cercanas para tu vehículo.", "Nearby options for your vehicle.") },
    { icon: MessageCircle, title: t("¿Dudas?", "Questions?"), text: t("Escríbenos por WhatsApp y te ayudamos.", "Message us on WhatsApp and we will help.") },
    { icon: ShieldCheck, title: t("Experiencia premium", "Premium experience"), text: t("Ambientes diseñados para tu comodidad y estilo.", "Spaces designed for your comfort and style.") }
  ];

  return (
    <section id="ubicacion" className="scroll-mt-24 bg-[#050a0d] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <LandingSectionTitle
          eyebrow={t("Ubicación y horarios", "Locations and hours")}
          title={t("Te esperamos en nuestras sedes", "We look forward to seeing you")}
          description={t(
            "Visítanos en Iquitos y disfruta una experiencia de barbería pensada para tu comodidad.",
            "Visit us in Iquitos and enjoy a barbering experience designed for your comfort."
          )}
        />

        {branches.length ? (
          <>
            <div className="no-scrollbar mx-auto mt-9 flex max-w-fit gap-2 overflow-x-auto rounded-full border border-white/10 bg-white/[0.025] p-1.5">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => selectBranch(branch.id)}
                  className="whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition"
                  style={{
                    borderColor: activeBranch === branch.id ? "rgba(244,171,73,.75)" : "transparent",
                    color: activeBranch === branch.id ? "#f4ab49" : "rgba(255,255,255,.62)",
                    background: activeBranch === branch.id ? "rgba(244,171,73,.08)" : "transparent"
                  }}
                >
                  {branch.name}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {branches.map((branch, index) => (
                <article
                  key={branch.id}
                  ref={(node) => { cardRefs.current[branch.id] = node; }}
                  className="group overflow-hidden rounded-3xl border bg-white/[0.03] transition duration-300 hover:-translate-y-1"
                  style={{ borderColor: activeBranch === branch.id ? "rgba(244,171,73,.6)" : "rgba(244,171,73,.24)" }}
                >
                  <div className="grid min-h-[31rem] md:grid-cols-[1.08fr_.92fr] lg:grid-cols-1 xl:grid-cols-[1.08fr_.92fr]">
                    <div className="flex flex-col p-6 md:p-7">
                      <span className="w-fit rounded-full border border-[rgba(244,171,73,.3)] bg-[rgba(244,171,73,.08)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--landing-gold-soft)]">
                        {index === 0 ? t("Sede principal", "Main location") : t("Sede", "Location")}
                      </span>
                      <h3 className="mt-5 text-2xl font-semibold text-white">{branch.name}</h3>
                      <div className="mt-4 flex gap-3 text-sm leading-6 text-[var(--text-muted)]">
                        <MapPin className="mt-0.5 shrink-0 text-[var(--landing-gold-soft)]" size={18} />
                        <div><p>{branch.address || t("Dirección disponible por WhatsApp.", "Address available via WhatsApp.")}</p><p>Iquitos · Loreto · Perú</p></div>
                      </div>

                      <div className="mt-7 border-t border-white/10 pt-6">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75"><Clock3 size={16} className="text-[var(--landing-gold-soft)]" /> {t("Horarios", "Hours")}</p>
                        <div className="mt-4 grid gap-3 text-sm">
                          <ScheduleRow label={t("Lunes a sábado", "Monday to Saturday")} value="9:30 AM - 9:30 PM" />
                          <ScheduleRow label={t("Domingos", "Sundays")} value="10:00 AM - 6:00 PM" />
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2 pt-7">
                        <a href={mapsUrl(branch.address, branch.name)} target="_blank" rel="noopener noreferrer" className="landing-secondary-button inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold">
                          <Navigation size={15} /> {t("Cómo llegar", "Directions")}
                        </a>
                        {branch.phone ? <a href={whatsapp(branch.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-[var(--text-muted)] transition hover:bg-white/5 hover:text-white"><MessageCircle size={15} /> {branch.phone}</a> : null}
                      </div>
                    </div>

                    <div className="relative min-h-56 overflow-hidden border-t border-white/10 bg-[radial-gradient(circle_at_70%_20%,rgba(244,171,73,.2),transparent_35%),linear-gradient(145deg,#15130f,#070a0c_60%,#0b1719)] md:border-l md:border-t-0 lg:border-l-0 lg:border-t xl:border-l xl:border-t-0">
                      {branch.imageUrl ? <img src={branch.imageUrl} alt={branch.imageAlt || branch.name} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
                      {branch.imageUrl ? <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" /> : null}
                      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:28px_28px]" />
                      <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center ${branch.imageUrl ? "justify-end pb-8" : ""}`}>
                        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(244,171,73,.35)] bg-black/35 text-[var(--landing-gold-soft)] backdrop-blur"><Store size={34} strokeWidth={1.3} /></span>
                        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-white/80">La Bajadita</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[var(--landing-gold-soft)]">Barber Studio</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : <EmptyLocations mainPhone={mainPhone} />}

        <div className="mt-8 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border-b border-white/10 p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2)]:border-r lg:last:border-r-0">
              <Icon size={21} className="text-[var(--landing-gold-soft)]" />
              <h4 className="mt-3 text-sm font-semibold text-white">{title}</h4>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">{t("¿Prefieres reservar tu cita?", "Would you rather book your appointment?")}</p>
          <Link href="/reservar" className="landing-primary-button mt-4 inline-flex w-full items-center justify-center gap-2 px-6 py-3 text-sm sm:w-auto">
            <CalendarDays size={17} /> {t("Reservar ahora", "Book now")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ScheduleRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-[var(--text-muted)]">{label}</span><span className="whitespace-nowrap font-medium text-white/85">{value}</span></div>;
}

function EmptyLocations({ mainPhone }: { mainPhone: string | null }) {
  const { t } = useLandingLanguage();
  return <div className="mx-auto mt-9 max-w-xl rounded-2xl border border-[var(--landing-border)] bg-white/[0.03] p-8 text-center"><MapPin className="mx-auto text-[var(--landing-gold-soft)]" /><p className="mt-4 text-white">{t("Estamos actualizando la información de nuestras sedes.", "We are updating our location information.")}</p>{mainPhone ? <a href={whatsapp(mainPhone)} target="_blank" rel="noopener noreferrer" className="landing-secondary-button mt-5 inline-flex items-center gap-2 px-4 py-2"><MessageCircle size={15} /> WhatsApp</a> : null}</div>;
}
