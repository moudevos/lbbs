"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import { dedupeById } from "@/lib/utils/dedupe-by-id";

type Review = {
  id: string;
  name: string;
  comment: string;
  rating: number;
  branchName: string | null;
};

function Stars({ rating }: { rating: number }) {
  return <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} className={index < rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[var(--text-faint)]"} />)}</div>;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex h-full w-80 shrink-0 flex-col justify-between rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.94))] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
      <div><Stars rating={review.rating} /><p className="mt-4 text-base leading-relaxed text-[var(--text-main)]">&ldquo;{review.comment}&rdquo;</p></div>
      <div className="mt-6 flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
        <span className="text-sm font-semibold text-white">{review.name}</span>
        <span className="text-xs text-[var(--text-muted)]">{review.branchName ?? "La Bajadita"}</span>
      </div>
    </article>
  );
}

export function TestimonialsMarquee() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/reviews")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar comentarios");
        setReviews(dedupeById<Review>((data.reviews ?? []) as Review[]).slice(0, 10));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loop = reviews.length > 3 ? [...reviews, ...reviews] : reviews;

  return (
    <section id="comentarios" className="relative scroll-mt-24 overflow-hidden bg-black py-16 md:py-20">
      <div className="mx-auto mb-12 max-w-7xl px-6">
        <LandingSectionTitle eyebrow="Comentarios" title="Lo que dicen nuestros clientes" description="Maximo 10 reseñas aprobadas desde el dashboard." />
      </div>
      {loading ? <div className="flex gap-6 px-6">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 w-80 shrink-0 animate-pulse rounded-2xl border border-[var(--border-soft)] bg-white/5" />)}</div> : null}
      {!loading && error ? <Message text={error} /> : null}
      {!loading && !error && reviews.length === 0 ? <Message text="Aun no hay comentarios aprobados." /> : null}
      {loop.length > 0 ? <div className="marquee-pause flex w-max gap-6 px-6"><div className={`${reviews.length > 3 ? "marquee" : ""} flex w-max gap-6`} style={reviews.length > 3 ? { animationName: "marquee-right", animationDuration: "46s" } : undefined}>{loop.map((review, index) => <ReviewCard key={`${review.id}-${index}`} review={review} />)}</div></div> : null}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent md:w-28" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent md:w-28" />
    </section>
  );
}

function Message({ text }: { text: string }) {
  return <div className="mx-6 rounded-2xl border border-[var(--border-soft)] bg-black/35 p-6 text-sm text-[var(--text-muted)]">{text}</div>;
}
