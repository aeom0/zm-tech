import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface SiteFooterProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function SiteFooter({ data, theme }: SiteFooterProps) {
  const { businessName, whatsapp, instagram, facebook, tiktok, address, city } = data

  const pills: string[] = []
  if (whatsapp) pills.push('WhatsApp')
  if (instagram) pills.push(theme.id === 'modern' ? instagram : 'Instagram')
  if (facebook) pills.push('Facebook')
  if (tiktok) pills.push('TikTok')
  if (theme.id === 'elegant' && address) pills.push('Ubicación')

  return (
    <footer className="border-t px-5 py-10" style={{ background: theme.colors.footerBg, borderColor: theme.colors.footerBorder }}>
      <div
        className={theme.id === 'elegant' ? 'mb-3.5 text-xl font-extrabold' : 'mb-2.5 text-lg font-extrabold'}
        style={{ color: theme.colors.footerText }}
      >
        {theme.renderBrand(businessName)}
      </div>
      {(city || address) && (
        <p className="mb-3.5 flex items-start gap-2 text-[13px]" style={{ color: theme.colors.footerTextMuted }}>
          <MapPin className="mt-0.5 flex-shrink-0" size={14} />
          <span>{[address, city].filter(Boolean).join(' · ')}</span>
        </p>
      )}
      <div className="mb-6 flex flex-wrap gap-1">
        {pills.map((pill) => (
          <span
            key={pill}
            className="inline-block rounded-full border px-4 py-1.5 text-xs"
            style={{
              borderColor: theme.colors.footerPillBorder,
              background: theme.colors.footerPillBg,
              color: theme.colors.footerPillText,
            }}
          >
            {pill}
          </span>
        ))}
      </div>
      <p
        className="border-t pt-4 text-[11px]"
        style={{ borderColor: theme.colors.footerBorder, color: theme.colors.footerTextMuted, opacity: 0.6 }}
      >
        Creado con{' '}
        <Link href="/" className="no-underline hover:underline" style={{ color: theme.colors.footerText, opacity: 0.7 }}>
          GeemaStudio
        </Link>
        {theme.id === 'elegant' && ' · Gestión profesional para salones de belleza'}
      </p>
    </footer>
  )
}
