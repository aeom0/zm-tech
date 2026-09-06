import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface TeamSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function TeamSection({ data, theme }: TeamSectionProps) {
  const { team } = data
  if (team.length === 0) return null

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
        Equipo
      </p>
      <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
        Nuestro equipo
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {team.map((member, i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-2xl border p-4 text-center"
            style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
          >
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.photoUrl} alt={member.name} className="mb-3 h-16 w-16 rounded-full object-cover" />
            ) : (
              <div
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ background: member.color ?? theme.colors.accent }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-sm font-semibold" style={{ color: theme.colors.text }}>
              {member.name}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>
              {member.role}
            </div>
            {member.speciality && (
              <span
                className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ background: theme.colors.secondaryAccentBg, color: theme.colors.secondaryAccent }}
              >
                {member.speciality}
              </span>
            )}
            {member.phrase && (
              <p className="mt-2 text-[11px] italic" style={{ color: theme.colors.textFaint }}>
                &ldquo;{member.phrase}&rdquo;
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
