import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import type { TenantLandingData } from '@/types/tenant-landing'
import { TenantLandingElegant } from '@/components/tenant-landing/TenantLandingElegant'
import { TenantLandingWarm } from '@/components/tenant-landing/TenantLandingWarm'
import { TenantLandingModern } from '@/components/tenant-landing/TenantLandingModern'

/** Templates disponibles, indexados directamente en cada page.tsx (`/s/[slug]` y `/_sites/[domain]`). */
export const TENANT_LANDING_TEMPLATES: Record<
  TenantLandingData['webTemplate'],
  ComponentType<{ data: TenantLandingData }>
> = {
  elegant: TenantLandingElegant,
  warm: TenantLandingWarm,
  modern: TenantLandingModern,
}

export function buildTenantLandingMetadata(data: TenantLandingData | null): Metadata {
  if (!data) {
    return { title: 'Salón no encontrado — GeemaStudio' }
  }

  const description =
    data.heroTagline ??
    data.tagline ??
    `Reserva tu cita en ${data.businessName}. Servicio profesional en ${data.city ?? 'tu ciudad'}.`

  return {
    title: `${data.businessName} — Reserva tu cita`,
    description,
    openGraph: {
      title: data.businessName,
      description,
      type: 'website',
    },
  }
}
