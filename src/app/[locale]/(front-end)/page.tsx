import "@/features/landing/landing.css";

import {
  LandingNavbar,
  HeroSection,
  StatsSection,
  FeaturesSection,
  StepsSection,
  TestimonialsSection,
  FAQSection,
  BottomCTA,
  LandingFooter,
} from "@/features/landing";

export default function LandingPage() {
  return (
    <div className="noise-overlay bg-[#060D18] text-[#E2EAF4] min-h-screen overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <StepsSection />
      <TestimonialsSection />
      <FAQSection />
      <BottomCTA />
      <LandingFooter />
    </div>
  );
}
