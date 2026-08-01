"use client";

import { useEffect } from "react";
import "@/app/landing.css";

import { NavBar } from "./NavBar";
import { HeroSection } from "./HeroSection";
import { ProblemSection } from "./ProblemSection";
import { FeaturesSection } from "./FeaturesSection";
import { MLSection } from "./MLSection";
import { PhoneSection } from "./PhoneSection";
import { PaymentsSection } from "./PaymentsSection";
import { PricingSection } from "./PricingSection";
import { ProofSection } from "./ProofSection";
import { CTASection } from "./CTASection";
import { LandingFooter } from "./LandingFooter";

export default function LandingPage() {
  // Scroll reveal — activa clase .visible cuando el elemento entra al viewport
  useEffect(() => {
    const reveals = document.querySelectorAll(".l-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <PhoneSection />
      <MLSection />
      <PaymentsSection />
      <PricingSection />
      <ProofSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
