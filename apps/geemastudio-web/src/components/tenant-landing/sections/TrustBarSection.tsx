import type { CSSProperties } from 'react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface TrustBarSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

interface Stat {
  value: string
  label: string
  accent?: boolean
}

export function TrustBarSection({ data, theme }: TrustBarSectionProps) {
  const { statClients, statRating, statYears } = data

  const stats: Stat[] =
    theme.id === 'elegant'
      ? [
          { value: statClients, label: 'Clientes felices' },
          { value: statRating, label: 'Calificación' },
          { value: statYears, label: 'Años contigo' },
        ]
      : theme.id === 'warm'
        ? [
            { value: statClients, label: 'Clientes' },
            { value: statRating, label: 'Google' },
            { value: statYears, label: 'Años' },
          ]
        : [
            { value: statClients, label: 'Clientes', accent: false },
            { value: statRating, label: 'Rating', accent: true },
            { value: statYears, label: 'Años', accent: false },
          ]

  const gradTextStyle: CSSProperties = theme.useGradientText
    ? {
        backgroundImage: theme.accentBackground,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : {}

  if (theme.id === 'elegant') {
    return (
      <section className="px-6 pb-16 text-center">
        <div className="flex flex-wrap justify-center gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-[28px] font-extrabold" style={gradTextStyle}>
                {stat.value}
              </div>
              <div className="mt-1 text-xs" style={{ color: theme.colors.textFaint }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (theme.id === 'warm') {
    return (
      <section className="px-5 pb-12">
        <div
          className="flex overflow-hidden rounded-2xl border"
          style={{ borderColor: theme.colors.statCardBorder, background: theme.colors.statCardBg }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex-1 border-r px-3 py-4 text-center last:border-r-0"
              style={{ borderColor: theme.colors.border }}
            >
              <div className="text-2xl font-extrabold" style={{ color: theme.colors.secondaryAccent }}>
                {stat.value}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: theme.colors.textFaint }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="px-5 pb-10">
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="rounded-[14px] border px-3 py-4 text-center"
            style={{ borderColor: theme.colors.statCardBorder, background: theme.colors.statCardBg }}
          >
            <div
              className="text-[22px] font-black tracking-tight"
              style={{ color: stat.accent ? theme.colors.accent : theme.colors.text }}
            >
              {stat.value}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: theme.colors.textFaint }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
