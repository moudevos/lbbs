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
import type { Metadata } from "next";
import { LandingLanguageProvider } from "@/components/landing/landing-language-provider";

export const revalidate = 300;
export const metadata: Metadata = {
  alternates: { canonical: "https://labajaditabarberstudio.com" }
};

function appUrl() {
  return "https://labajaditabarberstudio.com";
}

export default async function HomePage() {
  const landingData = await getLandingData();
  const baseUrl = appUrl();

  return (
    <LandingLanguageProvider>
    <main className="landing-public min-h-screen space-y-[5px] overflow-x-hidden bg-[var(--landing-bg)]">
      <PageVisibilityTitle />
      <LandingJsonLd data={landingData} appUrl={baseUrl} />
      <LandingNavbar />
      <LandingHero />
      <WhyChooseUs />
      <AboutStudio />
      <ServicesMarquee services={landingData.services} />
      <WorkCollage items={landingData.gallery} socialLinks={landingData.settings.socialLinks} phones={landingData.mainContact.phone ? [landingData.mainContact.phone] : landingData.settings.phones} />
      <TeamSection team={landingData.team} />
      <TestimonialsMarquee reviews={landingData.reviews} socialLinks={landingData.settings.socialLinks} mainPhone={landingData.mainContact.phone} />
      <LocationHours branches={landingData.branches} mainPhone={landingData.mainContact.phone} />
      <LandingFooter branches={landingData.branches} settings={landingData.settings} mainPhone={landingData.mainContact.phone} />
    </main>
    </LandingLanguageProvider>
  );
}
