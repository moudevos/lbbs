"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!item) return;

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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del trabajo: ${item.title}`}
    >
      {/* Fondo / click fuera */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm"
      />

      {/* Contenido */}
      <div className="relative z-10 grid w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,#141210,#0a0908)] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)] md:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition-colors hover:border-[var(--gold-soft)] hover:text-[var(--gold-soft)]"
        >
          <X size={18} />
        </button>

        {/* Imagen ampliada */}
        <div className="relative aspect-[4/3] min-h-[220px] bg-[radial-gradient(circle_at_30%_25%,_rgba(212,175,55,0.25),_transparent_60%),linear-gradient(160deg,#1c1c1c,#070707)] md:aspect-auto">
          <Image
            src={item.image}
            alt={`${item.title} — por ${item.barber}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* Detalles */}
        <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(212,175,55,0.12)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--gold-soft)]">
              <Scissors size={13} /> {item.service}
            </span>
            <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <UserRound size={15} className="text-[var(--gold-soft)]" /> Por {item.barber}
            </p>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-main)]">
              {item.detail}
            </p>
          </div>

          <Link
            href="/reservar"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5"
          >
            <CalendarCheck size={16} /> Reservar este estilo
          </Link>
        </div>
      </div>
    </div>
  );
}
