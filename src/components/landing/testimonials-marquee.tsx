import { Facebook, Instagram, MessageCircle, Music2, Star } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import type { LandingReview } from "@/lib/public/landing-data";
import { resolvePublicSocialLinks } from "@/lib/public/social-links";

function Stars({ rating }: { rating: number }) {
  const safeRating = Math.min(5, Math.max(0, Number(rating) || 0));
  return <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} className={index < safeRating ? "fill-[var(--landing-gold-soft)] text-[var(--landing-gold-soft)]" : "text-[var(--text-faint)]"} />)}</div>;
}

function ReviewCard({ review }: { review: LandingReview }) {
  return (
    <article className="flex h-full min-w-[82vw] max-w-[82vw] snap-start flex-col justify-between rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-panel)]/78 p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] sm:min-w-80 sm:max-w-80">
      <div><Stars rating={review.rating} /><p className="mt-4 text-base leading-relaxed text-[var(--landing-text)]">&ldquo;{review.comment}&rdquo;</p></div>
      <div className="mt-6 flex items-center justify-between border-t border-[var(--landing-border)] pt-4">
        <span className="text-sm font-semibold text-white">{review.name || "Cliente La Bajadita"}</span>
        <span className="text-xs text-[var(--text-muted)]">{review.branchName ?? "La Bajadita"}</span>
      </div>
    </article>
  );
}

export function TestimonialsMarquee({ reviews, socialLinks, mainPhone }: { reviews: LandingReview[]; socialLinks: string[]; mainPhone: string | null }) {
  const digits = mainPhone?.replace(/\D/g, "") ?? "";
  const whatsapp = digits ? `https://wa.me/${digits.startsWith("51") ? digits : `51${digits}`}` : "";
  return (
    <section id="comentarios" className="relative scroll-mt-24 bg-[var(--landing-bg)] py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10"><LandingSectionTitle eyebrow="Testimonios" title="Clientes que recomiendan La Bajadita" description="Reseñas aprobadas de clientes reales que visitaron nuestra barbería en Iquitos." /></div>
        {reviews.length === 0 ? <Placeholder socialLinks={socialLinks} whatsapp={whatsapp} /> : null}
        {reviews.length > 0 ? <div className="no-scrollbar -mx-6 flex snap-x gap-5 overflow-x-auto overflow-y-hidden px-6 pb-3 md:mx-0 md:px-0">{reviews.slice(0, 10).map((review) => <ReviewCard key={review.id} review={review} />)}</div> : null}
      </div>
    </section>
  );
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

