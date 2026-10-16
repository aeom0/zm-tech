import type { TenantConfig } from '@zmtech/tenant-config'

export type OnboardingBusinessType = TenantConfig['businessType']
export type OnboardingBusinessSubtype = TenantConfig['businessSubtype']

/** Datos del formulario de alta (`/registro` web, "Crear nuevo negocio" móvil). */
export interface SignupTenantInput {
  fullName: string
  email: string
  password: string
  businessName: string
}

export interface SignupTenantResult {
  tenantSlug: string
}

/** Respuestas del onboarding para armar el `TenantConfig` inicial. */
export interface OnboardingAnswers {
  businessName: string
  businessType: OnboardingBusinessType
  businessSubtype?: OnboardingBusinessSubtype
  countryCode: string
}

export interface OnboardingEmployeeInput {
  name: string
  color: string
}

/** Estado del alta del tenant de la sesión (redirect a onboarding, banner de correo, trial). */
export interface OnboardingStatus {
  isConfigured: boolean
  emailVerifiedAt: string | null
  subscriptionStatus: string | null
  trialEndsAt: string | null
}
