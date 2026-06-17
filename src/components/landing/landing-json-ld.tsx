import type { LandingData } from "@/lib/public/landing-data";

const OFFICIAL_URL = "https://labajaditabarberstudio.com";

export function LandingJsonLd({ data }: { data: LandingData; appUrl?: string }) {
  const sameAs = data.settings.socialLinks.filter((link) => /^https?:\/\//.test(link));
  const realAddresses = data.branches.filter((branch) => branch.address);
  const reviews = data.reviews.filter((review) => review.rating > 0 && review.comment);
  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length) * 10) / 10
    : null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    additionalType: "https://schema.org/BarberShop",
    name: "La Bajadita Barber Studio",
    url: OFFICIAL_URL,
    logo: `${OFFICIAL_URL}/landing/logo-bajadita.png`,
    image: `${OFFICIAL_URL}/landing/hero/hero-1.png`,
    description: "Reserva tu corte en La Bajadita Barber Studio, barbería premium en Iquitos: corte clásico, fade, barba y perfilado.",
    areaServed: ["Iquitos", "Maynas", "Loreto", "Perú"],
    priceRange: "S/",
    telephone: data.mainContact.phone ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    address: realAddresses.length ? realAddresses.map((branch) => ({
      "@type": "PostalAddress",
      streetAddress: branch.address,
      addressLocality: "Iquitos",
      addressRegion: "Loreto",
      addressCountry: "PE"
    })) : undefined,
    makesOffer: data.services.slice(0, 12).map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description ?? `Servicio de barbería en Iquitos: ${service.name}`
      },
      priceCurrency: "PEN",
      price: service.price ?? undefined,
      availability: "https://schema.org/InStock",
      url: `${OFFICIAL_URL}/reservar`
    })),
    aggregateRating: averageRating ? {
      "@type": "AggregateRating",
      ratingValue: averageRating,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1
    } : undefined,
    review: reviews.length ? reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.name },
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
      reviewBody: review.comment
    })) : undefined
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(stripUndefined(jsonLd)) }} />;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, stripUndefined(item)]));
}

