import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { WorkCollage } from "@/components/landing/work-collage";
import { ServicesMarquee } from "@/components/landing/services-marquee";
import { TeamSection } from "@/components/landing/team-section";
import { TestimonialsMarquee } from "@/components/landing/testimonials-marquee";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  return (
    <main className="min-h-screen space-y-[5px] overflow-x-hidden bg-black">
      <LandingNavbar />
      <LandingHero />
      <WorkCollage />
      <ServicesMarquee />
      <TeamSection />
      <TestimonialsMarquee />
      <LandingFooter />
    </main>
  );
}
