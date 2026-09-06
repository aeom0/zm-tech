import { MapPin } from 'lucide-react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'
import { formatBusinessHours } from '../shared/format-hours'

interface HoursLocationSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function HoursLocationSection({ data, theme }: HoursLocationSectionProps) {
  const dias = formatBusinessHours(data.businessHours)
  const showHours = dias.some((d) => d.enabled)
  const hasAddress = !!(data.address || data.city)

  if (!showHours && !hasAddress && !data.mapEmbedUrl) return null

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      {showHours && (
        <>
          <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
            Horario
          </p>
          <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
            Cuándo atendemos
          </h2>
          <div className="space-y-2">
            {dias.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
                style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
              >
                <span style={{ color: theme.colors.text, opacity: 0.85 }}>{d.label}</span>
                <span style={{ color: d.enabled ? theme.colors.textMuted : theme.colors.textFaint }}>
                  {d.hours}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {(hasAddress || data.mapEmbedUrl) && (
        <div className={showHours ? 'mt-6' : ''}>
          {!showHours && (
            <>
              <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
                Ubicación
              </p>
              <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
                Dónde encontrarnos
              </h2>
            </>
          )}
          {data.mapEmbedUrl ? (
            <iframe
              src={data.mapEmbedUrl}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-popups"
              className="h-64 w-full border-0"
              style={{ borderRadius: theme.radius.card }}
              title="Ubicación"
            />
          ) : (
            hasAddress && (
              <p className="flex items-start gap-2 text-sm" style={{ color: theme.colors.textMuted }}>
                <MapPin className="mt-0.5 flex-shrink-0" size={14} />
                <span>{[data.address, data.city].filter(Boolean).join(' · ')}</span>
              </p>
            )
          )}
        </div>
      )}
    </section>
  )
}
