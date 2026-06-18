"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Scissors, UserRound, X } from "lucide-react";
import type { LandingGalleryItem } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { useLandingLanguage } from "./landing-language-provider";

export function WorkDetailModal({ item, onClose }: { item: LandingGalleryItem | null; onClose: () => void }) {
  const { t } = useLandingLanguage();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!item) return;
    setLoaded(false);
    setFailed(false);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [item, onClose]);

  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Detalle de ${item.title}`}>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <div className="relative z-10 grid max-h-[90vh] w-[min(96vw,1100px)] overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-black md:grid-cols-[1.25fr_0.75fr]">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-black/75 p-2 text-white"><X size={18} /></button>
        <div className="relative h-[56vh] min-h-64 bg-[radial-gradient(circle_at_center,rgba(234,157,77,0.15),transparent_60%),#050505] md:h-[90vh]">
          {!failed ? <Image src={item.imageUrl} alt={item.altText} fill priority unoptimized sizes="(max-width: 768px) 100vw, 65vw" className={`object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} onLoadingComplete={() => setLoaded(true)} onError={() => setFailed(true)} /> : null}
          {!loaded && !failed ? <span className="absolute inset-0 grid place-items-center text-sm text-[var(--text-muted)]">{t("Cargando imagen...", "Loading image...")}</span> : null}
        </div>
        <div className="flex flex-col justify-between gap-6 overflow-y-auto p-6 md:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(234,157,77,0.12)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--landing-gold-soft)]"><Scissors size={13} /> {item.serviceName}</span>
            <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--text-muted)]"><UserRound size={15} /> {t("Por", "By")} {item.barberName}</p>
            {item.description ? <p className="mt-4 leading-relaxed text-[var(--landing-text)]">{item.description}</p> : null}
          </div>
          <Link href="/reservar" onClick={() => { trackEvent("gallery_reserve_click", { item_id: item.id, title: item.title }); onClose(); }} className="landing-primary-button inline-flex items-center justify-center gap-2 px-6 py-3 text-sm"><CalendarCheck size={16} /> {t("Reservar este estilo", "Book this style")}</Link>
        </div>
      </div>
    </div>
  );
}
