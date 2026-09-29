import Link from 'next/link'
import { socialProfileUrl } from '@zmtech/tenant-config'
import { MapPin } from 'lucide-react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface SiteFooterProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function SiteFooter({ data, theme }: SiteFooterProps) {
  const { businessName, whatsapp, instagram, facebook, tiktok, address, city } = data

  const pills: { label: string; href: string | null }[] = []
  if (whatsapp) {
    pills.push({ label: 'WhatsApp', href: `https://wa.me/${whatsapp.replace(/\D/g, '')}` })
  }
  if (instagram) {
    pills.push({
      label: theme.id === 'modern' ? instagram : 'Instagram',
      href: socialProfileUrl('instagram', instagram),
    })
  }
  if (facebook) pills.push({ label: 'Facebook', href: socialProfileUrl('facebook', facebook) })
  if (tiktok) pills.push({ label: 'TikTok', href: socialProfileUrl('tiktok', tiktok) })
  if (theme.id === 'elegant' && address) pills.push({ label: 'Ubicación', href: null })

  return (
    <footer
      className="border-t px-5 py-10"
      style={{ background: theme.colors.footerBg, borderColor: theme.colors.footerBorder }}
    >
      <div
        className={
          theme.id === 'elegant' ? 'mb-3.5 text-xl font-extrabold' : 'mb-2.5 text-lg font-extrabold'
        }
        style={{ color: theme.colors.footerText }}
      >
        {theme.renderBrand(businessName)}
      </div>
      {(city || address) && (
        <p
          className="mb-3.5 flex items-start gap-2 text-[13px]"
          style={{ color: theme.colors.footerTextMuted }}
        >
          <MapPin className="mt-0.5 flex-shrink-0" size={14} />
          <span>{[address, city].filter(Boolean).join(' · ')}</span>
        </p>
      )}
      <div className="mb-6 flex flex-wrap gap-1">
        {pills.map((pill) => {
          const pillProps = {
            className: 'inline-block rounded-full border px-4 py-1.5 text-xs no-underline',
            style: {
              borderColor: theme.colors.footerPillBorder,
              background: theme.colors.footerPillBg,
              color: theme.colors.footerPillText,
            },
          }
          return pill.href ? (
            <a
              key={pill.label}
              href={pill.href}
              target="_blank"
              rel="noopener noreferrer"
              {...pillProps}
            >
              {pill.label}
            </a>
          ) : (
            <span key={pill.label} {...pillProps}>
              {pill.label}
            </span>
          )
        })}
      </div>
      <p
        className="border-t pt-4 text-[11px]"
        style={{
          borderColor: theme.colors.footerBorder,
          color: theme.colors.footerTextMuted,
          opacity: 0.6,
        }}
      >
        Creado con{' '}
        <Link
          href="/"
          className="no-underline hover:underline"
          style={{ color: theme.colors.footerText, opacity: 0.7 }}
        >
          GeemaStudio
        </Link>
        {theme.id === 'elegant' && ' · Gestión profesional para salones de belleza'}
      </p>
    </footer>
  )
}
