import type { TenantConfig } from '@zmtech/tenant-config'

/**
 * Feather icons disponibles para categorías de servicio. El orden importa: en
 * `getServiceIconOptions` se reordena para que los más relevantes al rubro del
 * tenant aparezcan primero en el selector.
 */
export const SERVICE_ICON_OPTIONS = [
  'scissors',
  'feather',
  'eye',
  'smile',
  'droplet',
  'sun',
  'wind',
  'heart',
  'star',
  'zap',
] as const

export type ServiceIconName = (typeof SERVICE_ICON_OPTIONS)[number]

const DEFAULT_ICON_BY_BUSINESS_TYPE: Record<TenantConfig['businessType'], ServiceIconName> = {
  'spa-nails': 'droplet',
  barbershop: 'scissors',
  'hair-salon': 'scissors',
  'full-aesthetic': 'sun',
}

/**
 * Icono de respaldo cuando una categoría no tiene `icon` propio en BD — antes
 * era siempre 'scissors' (el default de columna), lo que no encaja con
 * negocios de uñas/estética. Se elige según el rubro del tenant en su lugar.
 */
export function getDefaultServiceIcon(businessType: TenantConfig['businessType']): ServiceIconName {
  return DEFAULT_ICON_BY_BUSINESS_TYPE[businessType] ?? 'scissors'
}

/** Lista de íconos para el selector, con los más relevantes al rubro primero. */
export function getServiceIconOptions(
  businessType: TenantConfig['businessType']
): ServiceIconName[] {
  const primary = getDefaultServiceIcon(businessType)
  return [primary, ...SERVICE_ICON_OPTIONS.filter((icon) => icon !== primary)]
}
