import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface SalonVideoSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function SalonVideoSection({ data, theme }: SalonVideoSectionProps) {
  if (!data.salonVideoUrl) return null

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
        Nuestro espacio
      </p>
      <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
        Conoce nuestro espacio
      </h2>
      <video controls className="w-full overflow-hidden" style={{ borderRadius: theme.radius.card }} src={data.salonVideoUrl} />
    </section>
  )
}
