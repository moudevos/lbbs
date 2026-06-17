import type { LandingData } from "@/lib/public/landing-data";

export function LandingJsonLd({ data, appUrl }: { data: LandingData; appUrl: string }) {
  const baseUrl = appUrl.replace(/\/$/, "");
  const logo = `${baseUrl}/landing/logo-bajadita.jpg`;
  const image = `${baseUrl}/landing/hero/hero-1.png`;
  const sameAs = data.settings.socialLinks.filter((link) => /^https?:\/\//.test(link));
  const phones = [...data.settings.phones, ...data.branches.map((branch) => branch.phone).filter(Boolean)];
  const realAddresses = data.branches.filter((branch) => branch.address);
  const reviews = data.reviews.filter((review) => review.rating > 0 && review.comment);
  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length) * 10) / 10
    : null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    additionalType: "https://schema.org/BarberShop",
    name: "La Bajadita Barber Studio",
    description: "Barbería premium en Iquitos con corte clásico, fade, barba, perfilado y atención personalizada.",
    url: baseUrl,
    logo,
    image,
    telephone: phones[0] ?? undefined,
    priceRange: "S/",
    areaServed: ["Iquitos", "Maynas", "Loreto", "Peru"],
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
        description: service.description ?? `Servicio de barberia en Iquitos: ${service.name}`
      },
      priceCurrency: "PEN",
      price: service.price ?? undefined,
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/reservar`
    })),
    aggregateRating: averageRating && reviews.length > 0 ? {
      "@type": "AggregateRating",
      ratingValue: averageRating,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1
    } : undefined,
    review: reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.name
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1
      },
      reviewBody: review.comment
    }))
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(stripUndefined(jsonLd)) }} />;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, stripUndefined(item)]));
}
