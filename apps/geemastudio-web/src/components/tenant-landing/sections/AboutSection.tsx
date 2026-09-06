import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface AboutSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function AboutSection({ data, theme }: AboutSectionProps) {
  if (!data.about) return null

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
        Nosotros
      </p>
      <h2 className="mb-4 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
        Conócenos
      </h2>
      <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
        {data.about}
      </p>
    </section>
  )
}
