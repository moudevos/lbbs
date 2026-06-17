"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Scissors, UserRound, X } from "lucide-react";

export type WorkItem = {
  id: string;
  title: string;
  barber: string;
  detail: string;
  service: string;
  image: string;
  className: string;
};

type WorkDetailModalProps = {
  item: WorkItem | null;
  onClose: () => void;
};

export function WorkDetailModal({ item, onClose }: WorkDetailModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!item) return;
    setImageLoaded(false);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Detalle del trabajo: ${item.title}`}>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm" />

      <div className="relative z-10 grid max-h-[90vh] w-[min(96vw,1100px)] overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)] md:grid-cols-[1.25fr_0.75fr]">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white transition-colors hover:border-[var(--landing-gold-soft)] hover:text-[var(--landing-gold-soft)]">
          <X size={18} />
        </button>

        <div className="relative h-[58vh] min-h-[260px] bg-black md:h-[90vh]">
          {!imageLoaded ? (
            <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(234,157,77,0.12),transparent_58%),#050A0D] text-sm text-[var(--text-muted)]">
              Cargando imagen...
            </div>
          ) : null}
          <Image
            src={item.image}
            alt={`${item.title} - por ${item.barber}`}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-contain transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoadingComplete={() => setImageLoaded(true)}
          />
        </div>

        <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(212,175,55,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">
              <Scissors size={13} /> {item.service}
            </span>
            <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <UserRound size={15} className="text-[var(--gold-soft)]" /> Por {item.barber}
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-main)]">{item.detail}</p>
          </div>

          <Link href="/reservar" onClick={onClose} className="landing-primary-button inline-flex items-center justify-center gap-2 px-6 py-3 text-sm">
            <CalendarCheck size={16} /> Reservar este estilo
          </Link>
        </div>
      </div>
    </div>
  );
}
