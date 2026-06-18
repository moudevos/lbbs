"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, MessageCircle, Music2 } from "lucide-react";
import { LandingSectionTitle } from "./landing-section-title";
import { WorkDetailModal } from "./work-detail-modal";
import type { LandingGalleryItem } from "@/lib/public/landing-data";
import { trackEvent } from "@/lib/analytics/track-event";
import { useLandingLanguage } from "./landing-language-provider";

const VISIBLE_COUNT = 5;
const ROTATION_MS = 60000;

const COLLAGE_LAYOUTS = [
  [
    "col-start-1 col-span-8 row-start-1 row-span-3",
    "col-start-9 col-span-4 row-start-1 row-span-2",
    "col-start-9 col-span-4 row-start-3 row-span-3",
    "col-start-1 col-span-4 row-start-4 row-span-2",
    "col-start-5 col-span-4 row-start-4 row-span-2"
  ],
  [
    "col-start-1 col-span-4 row-start-1 row-span-4",
    "col-start-5 col-span-8 row-start-1 row-span-3",
    "col-start-1 col-span-4 row-start-5 row-span-2",
    "col-start-5 col-span-4 row-start-4 row-span-3",
    "col-start-9 col-span-4 row-start-4 row-span-3"
  ],
  [
    "col-start-1 col-span-4 row-start-1 row-span-3",
    "col-start-5 col-span-4 row-start-1 row-span-3",
    "col-start-9 col-span-4 row-start-1 row-span-3",
    "col-start-1 col-span-8 row-start-4 row-span-3",
    "col-start-9 col-span-4 row-start-4 row-span-3"
  ]
];
const areas = ["one", "two", "three", "four", "five"];

export function WorkCollage({ items, socialLinks, phones }: { items: LandingGalleryItem[]; socialLinks: string[]; phones: string[] }) {
  const { t } = useLandingLanguage();
  const [selected, setSelected] = useState<LandingGalleryItem | null>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => setRotation((value) => value + 1), ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const visible = useMemo(() => {
    if (!items.length) return [];
    const start = items.length > VISIBLE_COUNT ? (rotation * VISIBLE_COUNT) % items.length : 0;
    const count = Math.min(items.length, VISIBLE_COUNT);
    return Array.from({ length: count }, (_, index) => items[(start + index) % items.length]);
  }, [items, rotation]);

  function open(item: LandingGalleryItem) {
    setSelected(item);
    trackEvent("gallery_image_open", { item_id: item.id, title: item.title, service_name: item.serviceName });
  }

  return (
    <section id="trabajo" className="relative scroll-mt-24 overflow-hidden bg-[#050505] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-3xl">
          <LandingSectionTitle align="left" eyebrow={t("Nuestro trabajo", "Our work")} title={t("Cortes que hablan por ti", "Haircuts that speak for you")} description={t("Cada acabado refleja precisión, estilo y la experiencia de una barbería premium en Iquitos.", "Every finish reflects precision, style and the experience of a premium barbershop in Iquitos.")} />
        </div>

        {!items.length ? <GalleryEmpty socialLinks={socialLinks} phones={phones} /> : (
          <>
            <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-3 md:hidden">
              {items.map((item, index) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  onOpen={() => open(item)}
                  className={`min-w-[82vw] snap-start ${mobileHeights[index % mobileHeights.length]}`}
                />
              ))}
            </div>
            <div className="relative hidden aspect-[6/5] w-full overflow-hidden rounded-[1.8rem] md:block">
              <div key={rotation} className="absolute inset-x-0 top-0 grid aspect-square w-full grid-cols-12 grid-rows-6 gap-4 motion-safe:animate-[galleryFade_700ms_ease-out]">
                {Array.from({ length: VISIBLE_COUNT }, (_, index) => {
                  const item = visible[index];
                  const slotClass = COLLAGE_LAYOUTS[rotation % COLLAGE_LAYOUTS.length][index];
                  return item ? (
                    <GalleryCard key={`${item.id}-${index}`} item={item} onOpen={() => open(item)} className={slotClass} />
                  ) : (
                    <GalleryPlaceholder key={`placeholder-${index}`} className={slotClass} />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <WorkDetailModal item={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

const mobileHeights = ["h-[72vw]", "h-[62vw]", "h-[68vw]", "h-[76vw]", "h-[64vw]"];

function GalleryCard({ item, onOpen, className = "" }: { item: LandingGalleryItem; onOpen: () => void; className?: string }) {
  const { t } = useLandingLanguage();
  const [imageError, setImageError] = useState(false);

  return (
    <button type="button" onClick={onOpen} className={`group relative overflow-hidden rounded-[1.4rem] bg-[#111] text-left transition duration-500 ${className}`} aria-label={`${t("Ver", "View")} ${item.title}`}>
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(234,157,77,0.22),transparent_60%),linear-gradient(160deg,#162020,#050A0D)]" />
      {!imageError ? (
        <Image
          src={item.imageUrl}
          alt={item.altText || `${item.title} en La Bajadita Barber Studio, barberia en Iquitos`}
          fill
          loading="lazy"
          quality={72}
          unoptimized
          sizes="(max-width: 768px) 82vw, 40vw"
          className="object-cover transition duration-700 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70" />
      <div className="absolute inset-x-4 bottom-4">
        <p className="font-semibold text-white">{item.title}</p>
        <p className="text-xs text-[var(--landing-gold-soft)]">{item.serviceName} · {item.barberName}</p>
      </div>
    </button>
  );
}

function GalleryPlaceholder({ className }: { className: string }) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-[1.4rem] bg-[#111] ${className}`}>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(234,157,77,0.22),transparent_60%),linear-gradient(160deg,#162020,#050A0D)]" />
      <span className="absolute inset-x-5 bottom-5 h-px bg-gradient-to-r from-[var(--landing-gold)]/45 to-transparent" />
    </div>
  );
}

function GalleryEmpty({ socialLinks, phones }: { socialLinks: string[]; phones: string[] }) {
  const { t } = useLandingLanguage();
  const links = [
    ...socialLinks.map((href) => ({ href, label: href.includes("instagram") ? "Instagram" : href.includes("tiktok") ? "TikTok" : "Facebook", icon: href.includes("instagram") ? Instagram : href.includes("tiktok") ? Music2 : Facebook })),
    ...(phones[0] ? [{ href: `https://wa.me/51${phones[0].replace(/\D/g, "")}`, label: "WhatsApp", icon: MessageCircle }] : [])
  ];
  return (
    <div className="grid gap-6 rounded-3xl border border-[var(--landing-border)] bg-black/30 p-6 md:grid-cols-2">
      <div className="grid aspect-square grid-cols-2 gap-3">
        {areas.map((area, index) => <div key={area} className={`rounded-2xl bg-[radial-gradient(circle_at_30%_25%,rgba(234,157,77,0.18),transparent_55%),#111] ${index === 0 ? "col-span-2" : ""}`} />)}
      </div>
      <div className="flex flex-col justify-center">
        <h3 className="text-2xl font-semibold text-white">{t("Nuevos estilos en camino", "New styles coming soon")}</h3>
        <p className="mt-3 text-[var(--text-muted)]">{t("Muy pronto compartiremos nuestros trabajos recientes. Síguenos en redes para ver más cortes y estilos.", "We will soon share our latest work. Follow us on social media to see more haircuts and styles.")}</p>
        <div className="mt-5 flex flex-wrap gap-2">{links.map(({ href, label, icon: Icon }) => <a key={href} href={href} target="_blank" rel="noreferrer" onClick={() => trackEvent("social_click", { network: label })} className="landing-secondary-button inline-flex items-center gap-2 px-4 py-2 text-sm"><Icon size={15} /> {label}</a>)}</div>
      </div>
    </div>
  );
}
