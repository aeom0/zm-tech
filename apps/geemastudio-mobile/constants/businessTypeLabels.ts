import type { TenantConfig } from '@zmtech/tenant-config'

const BUSINESS_TYPE_LABELS: Record<TenantConfig['businessType'], string> = {
  'spa-nails': 'Spa / Uñas',
  barbershop: 'Barbería',
  'hair-salon': 'Peluquería',
  'full-aesthetic': 'Estética Integral',
}

export function getBusinessTypeLabel(businessType: TenantConfig['businessType']): string {
  return BUSINESS_TYPE_LABELS[businessType] ?? businessType
}
