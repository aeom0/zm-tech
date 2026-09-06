import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'
import { BookingButton } from '../shared/BookingButton'

interface NavbarProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function Navbar({ data, theme }: NavbarProps) {
  const { businessName, whatsapp } = data

  const paddingX = theme.id === 'elegant' ? 'px-6' : 'px-5'
  const blur = theme.id === 'warm' ? '' : theme.id === 'modern' ? 'backdrop-blur-xl' : 'backdrop-blur-md'
  const brandClass =
    theme.id === 'elegant'
      ? 'text-xl font-extrabold tracking-tight'
      : theme.id === 'modern'
        ? 'text-[17px] font-extrabold'
        : 'text-lg font-extrabold'
  const ctaPaddingX = theme.id === 'warm' ? 'px-[18px]' : 'px-5'

  return (
    <nav
      className={`sticky top-0 z-50 flex items-center justify-between ${paddingX} py-4 border-b ${blur}`}
      style={{ background: theme.colors.navBg, borderColor: theme.colors.divider }}
    >
      <div className={brandClass} style={{ color: theme.colors.text }}>
        {theme.renderBrand(businessName)}
      </div>
      <BookingButton
        phone={whatsapp}
        businessName={businessName}
        label={theme.id === 'modern' ? 'Reservar →' : 'Reservar'}
        className={`inline-block ${ctaPaddingX} py-2.5 text-[13px] font-semibold no-underline`}
        style={{
          background: theme.colors.navCtaBg,
          color: theme.colors.navCtaText,
          borderRadius: theme.radius.button,
        }}
      />
    </nav>
  )
}
