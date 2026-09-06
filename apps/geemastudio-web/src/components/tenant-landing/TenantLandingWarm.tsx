import { warmTheme } from './theme/presets'
import {
  Navbar,
  HeroSection,
  TrustBarSection,
  AboutSection,
  HoursLocationSection,
  ServicesSection,
  GallerySection,
  SalonVideoSection,
  TestimonialsSection,
  PromotionsSection,
  TeamSection,
  FinalCtaSection,
  SiteFooter,
} from './sections'
import { WhatsAppFAB } from './shared/WhatsAppFAB'
import type { TenantLandingProps } from '@/types/tenant-landing'

export function TenantLandingWarm({ data }: TenantLandingProps) {
  const theme = warmTheme

  return (
    <div
      className="min-h-screen"
      style={{ background: theme.colors.bg, color: theme.colors.text, fontFamily: 'system-ui, sans-serif' }}
    >
      <Navbar data={data} theme={theme} />
      <HeroSection data={data} theme={theme} />
      <TrustBarSection data={data} theme={theme} />
      <AboutSection data={data} theme={theme} />
      <HoursLocationSection data={data} theme={theme} />
      <ServicesSection data={data} theme={theme} />
      <GallerySection data={data} theme={theme} />
      <SalonVideoSection data={data} theme={theme} />
      <TestimonialsSection data={data} theme={theme} />
      <PromotionsSection data={data} theme={theme} />
      <TeamSection data={data} theme={theme} />
      <FinalCtaSection data={data} theme={theme} />
      <SiteFooter data={data} theme={theme} />
      <WhatsAppFAB phone={data.whatsapp} businessName={data.businessName} />
    </div>
  )
}
