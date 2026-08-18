export type {
  OdentalRole,
  OdentalBusinessSubtype,
  OdentalTenantSettingsRow,
  OdentalEmployeeRow,
  OdentalTenantConfig,
  OdentalJwtClaims,
} from './types'

export { dentalClinicPreset, mergeOdentalTenantConfig } from './preset'

export { extractOdentalClaims, extractOdentalClaimsFromUser, isOdentalAdmin } from './jwt'

export { OdentalAuthProvider, useOdentalAuth, useAuth } from './AuthContext'

export { OdentalTenantProvider, useTenant, useOdentalTenant } from './TenantContext'
