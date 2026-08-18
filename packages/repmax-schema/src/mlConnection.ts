// ============================================================
// Contrato OAuth MercadoLibre — camelCase, sin `any`
// Tabla: public.repmax_ml_connections (migración 20260812010000)
// ============================================================

export const ML_CONNECTION_STATUSES = ['active', 'expired', 'revoked'] as const
export type MlConnectionStatusDb = (typeof ML_CONNECTION_STATUSES)[number]

export const ML_SITE_BY_COUNTRY = {
  VE: 'MLV',
  CO: 'MCO',
  PE: 'MPE',
  EC: 'MEC',
  DO: 'MDO',
} as const

export type MlCountryCode = keyof typeof ML_SITE_BY_COUNTRY
export type MlSiteId = (typeof ML_SITE_BY_COUNTRY)[MlCountryCode]

/** Fila persistida. El cliente NO debe seleccionar accessToken/refreshToken. */
export interface RepmaxMlConnection {
  id: string
  storeId: string
  mlUserId: number
  siteId: string
  status: MlConnectionStatusDb
  expiresAt: string
  connectedBy: string | null
  connectedAt: string
  updatedAt: string
}

/** Status expuesto a la UI (sin tokens). */
export type MlConnectionUiStatus = 'disconnected' | 'connecting' | 'connected' | 'expired' | 'error'
