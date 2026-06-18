"use client";

import { Facebook, Instagram, MessageCircle, Music2, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingReview } from "@/lib/public/landing-data";
import { resolvePublicSocialLinks } from "@/lib/public/social-links";

function Stars({ rating, centered = false }: { rating: number; centered?: boolean }) {
  const safeRating = Math.min(5, Math.max(0, Number(rating) || 0));
  return <div className={`flex gap-0.5 ${centered ? "justify-center" : ""}`}>{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} className={index < safeRating ? "fill-[var(--landing-gold-soft)] text-[var(--landing-gold-soft)]" : "text-[var(--text-faint)]"} />)}</div>;
}

function ReviewCard({ review, onOpen }: { review: LandingReview; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex h-72 w-80 shrink-0 flex-col justify-between rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/90 p-6 text-center shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] transition hover:-translate-y-1 hover:border-[var(--border-strong)] sm:w-96">
      <div>
        <Stars rating={review.rating} centered />
        <p className="mt-4 line-clamp-5 text-base leading-relaxed text-[var(--landing-text)]">&ldquo;{review.comment}&rdquo;</p>
      </div>
      <div className="mt-6 border-t border-[var(--landing-border)] pt-4">
        <p className="text-sm font-semibold text-white">{review.name || "Cliente La Bajadita"}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{review.branchName ?? "La Bajadita"}</p>
      </div>
    </button>
  );
}

export function TestimonialsMarquee({ reviews, socialLinks, mainPhone }: { reviews: LandingReview[]; socialLinks: string[]; mainPhone: string | null }) {
  const [selected, setSelected] = useState<LandingReview | null>(null);
  const visibleReviews = reviews.slice(0, 10);
  const repeatedReviews = [...visibleReviews, ...visibleReviews];
  const canAnimate = visibleReviews.length >= 4;
  const digits = mainPhone?.replace(/\D/g, "") ?? "";
  const whatsapp = digits ? `https://wa.me/${digits.startsWith("51") ? digits : `51${digits}`}` : "";

  return (
    <section id="comentarios" className="relative scroll-mt-24 overflow-hidden bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center"><LandingSectionTitle eyebrow="Testimonios" title="Clientes que recomiendan La Bajadita" description="Reseñas aprobadas de clientes reales que visitaron nuestra barbería en Iquitos." /></div>
        {visibleReviews.length === 0 ? <Placeholder socialLinks={socialLinks} whatsapp={whatsapp} /> : null}
      </div>
      {visibleReviews.length > 0 && !canAnimate ? (
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-5 px-6 py-3">
          {visibleReviews.map((review) => <ReviewCard key={review.id} review={review} onOpen={() => setSelected(review)} />)}
        </div>
      ) : null}
      {canAnimate ? (
        <div className="reviews-marquee-pause overflow-hidden">
          <div className="reviews-marquee flex w-max gap-5 py-3">
            {repeatedReviews.map((review, index) => <ReviewCard key={`${review.id}-${index}`} review={review} onOpen={() => setSelected(review)} />)}
          </div>
        </div>
      ) : null}
      <ReviewModal review={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function ReviewModal({ review, onClose }: { review: LandingReview | null; onClose: () => void }) {
  useEffect(() => {
    if (!review) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [review, onClose]);

  if (!review) return null;
  return (
    <div className="fixed inset-0 z-[1400] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={`Reseña de ${review.name}`}>
      <button type="button" aria-label="Cerrar reseña" onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
      <article className="relative z-10 w-[min(34rem,100%)] rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)] p-6 text-center shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 rounded-full border border-[var(--landing-border)] p-2 text-white"><X size={18} /></button>
        <Stars rating={review.rating} centered />
        <blockquote className="mt-6 text-lg leading-relaxed text-[var(--landing-text)]">&ldquo;{review.comment}&rdquo;</blockquote>
        <div className="mt-7 border-t border-[var(--landing-border)] pt-5">
          <p className="font-semibold text-white">{review.name || "Cliente La Bajadita"}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{review.branchName ?? "La Bajadita Barber Studio"}</p>
          <time dateTime={review.createdAt} className="mt-2 block text-xs text-[var(--text-faint)]">{formatReviewDate(review.createdAt)}</time>
        </div>
      </article>
    </div>
  );
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function Placeholder({ socialLinks, whatsapp }: { socialLinks: string[]; whatsapp: string }) {
  const links = resolvePublicSocialLinks(socialLinks, whatsapp);
  const items = [
    { label: "Instagram", href: links.instagram, icon: Instagram },
    { label: "TikTok", href: links.tiktok, icon: Music2 },
    { label: "Facebook", href: links.facebook, icon: Facebook },
    { label: "WhatsApp", href: links.whatsapp, icon: MessageCircle }
  ];
  return (
    <div className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/70 p-6 text-center text-sm text-[var(--text-muted)]">
      <p>Aún estamos reuniendo reseñas en esta página. Síguenos en redes y cuéntanos tu experiencia después de tu atención.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {items.map(({ label, href, icon: Icon }) => href ? <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--landing-border)] text-[var(--landing-gold-soft)] transition hover:border-[var(--landing-gold-soft)] hover:bg-white/5"><Icon size={17} /></a> : <span key={label} aria-label={`${label} próximamente`} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--landing-border)] text-[var(--text-faint)]"><Icon size={17} /></span>)}
      </div>
    </div>
  );
}
