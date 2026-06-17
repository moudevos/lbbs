import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { WorkCollage } from "@/components/landing/work-collage";
import { ServicesMarquee } from "@/components/landing/services-marquee";
import { TeamSection } from "@/components/landing/team-section";
import { TestimonialsMarquee } from "@/components/landing/testimonials-marquee";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingJsonLd } from "@/components/landing/landing-json-ld";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { AboutStudio } from "@/components/landing/about-studio";
import { LocationHours } from "@/components/landing/location-hours";
import { PageVisibilityTitle } from "@/components/landing/page-visibility-title";
import { getLandingData } from "@/lib/public/landing-data";

export const revalidate = 300;

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
}

export default async function HomePage() {
  const landingData = await getLandingData();
  const baseUrl = appUrl();

  return (
    <main className="landing-public min-h-screen space-y-[5px] overflow-x-hidden bg-[var(--landing-bg)]">
      <PageVisibilityTitle />
      <LandingJsonLd data={landingData} appUrl={baseUrl} />
      <LandingNavbar />
      <LandingHero />
      <WhyChooseUs />
      <AboutStudio />
      <ServicesMarquee services={landingData.services} />
      <WorkCollage />
      <TeamSection team={landingData.team} />
      <TestimonialsMarquee reviews={landingData.reviews} />
      <LocationHours branches={landingData.branches} settings={landingData.settings} />
      <LandingFooter branches={landingData.branches} settings={landingData.settings} />
    </main>
  );
}
