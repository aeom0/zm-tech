import { Navbar } from '@/components/ui/Navbar'
import { HeroSection } from '@/components/sections/HeroSection'
import { PainSection } from '@/components/sections/PainSection'
import { FeaturesSection } from '@/components/sections/FeaturesSection'
import { DemoSection } from '@/components/sections/DemoSection'
import { SocialProofSection } from '@/components/sections/SocialProofSection'
import { PricingSection } from '@/components/sections/PricingSection'
import { FaqSection } from '@/components/sections/FaqSection'
import { CtaSection } from '@/components/sections/CtaSection'
import { Footer } from '@/components/layout/Footer'
import { getLandingPlans } from '@/lib/plans-service'

// Los precios salen de la tabla `plans`; se revalidan cada hora.
export const revalidate = 3600

export default async function LandingPage() {
  const plans = await getLandingPlans()

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <PainSection />
      <FeaturesSection />
      <DemoSection />
      <SocialProofSection />
      <PricingSection plans={plans} />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
