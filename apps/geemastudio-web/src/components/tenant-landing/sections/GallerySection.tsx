import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface GallerySectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function GallerySection({ data, theme }: GallerySectionProps) {
  if (data.gallery.length === 0) return null

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
        Galería
      </p>
      <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
        Nuestro trabajo
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.gallery.map((item, i) => (
          <div key={i} className="overflow-hidden" style={{ borderRadius: theme.radius.card }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.alt} loading="lazy" className="aspect-square w-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  )
}
