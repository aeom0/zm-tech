import type { SupabaseClient } from '@supabase/supabase-js'
import {
  barbershopPreset,
  defaultTenantConfig,
  fullAestheticPreset,
  hairSalonPreset,
  localeFromCountry,
  spaNavilsPreset,
  type TenantConfig,
} from '@zmtech/tenant-config'

import { mapConfigToRow } from '../tenant-settings/tenantSettingsService'
import type {
  OnboardingAnswers,
  OnboardingBusinessType,
  OnboardingEmployeeInput,
  OnboardingStatus,
  SignupTenantInput,
  SignupTenantResult,
} from './types'

const SIGNUP_FALLBACK_ERROR = 'No pudimos crear tu cuenta. Intenta de nuevo.'

/** Error con mensaje listo para mostrar en UI (español neutro). */
export class OnboardingError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'OnboardingError'
  }
}

export const ONBOARDING_PRESETS: Record<OnboardingBusinessType, TenantConfig> = {
  'spa-nails': spaNavilsPreset,
  barbershop: barbershopPreset,
  'hair-salon': hairSalonPreset,
  'full-aesthetic': fullAestheticPreset,
}

/**
 * Alta self-service: Edge `signup-tenant` crea el usuario dueño y el tenant
 * (Pro, trial 14 días). Luego hay que iniciar sesión con la contraseña para
 * obtener el JWT con `tenant_id`.
 */
export async function signupTenant(
  client: SupabaseClient,
  input: SignupTenantInput
): Promise<SignupTenantResult> {
  const { data, error } = await client.functions.invoke<{ tenantSlug?: string; error?: string }>(
    'signup-tenant',
    { body: input }
  )

  if (error) {
    let message = SIGNUP_FALLBACK_ERROR
    let status: number | undefined
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      status = context.status
      try {
        const body = (await context.json()) as { error?: unknown }
        if (typeof body.error === 'string' && body.error) message = body.error
      } catch {
        // cuerpo no JSON: se queda el mensaje genérico
      }
    }
    throw new OnboardingError(message, status)
  }

  if (!data?.tenantSlug) throw new OnboardingError(SIGNUP_FALLBACK_ERROR)
  return { tenantSlug: data.tenantSlug }
}

/** Config inicial: preset del rubro + locale del país elegido. */
export function buildOnboardingConfig(answers: OnboardingAnswers): TenantConfig {
  const preset = ONBOARDING_PRESETS[answers.businessType] ?? defaultTenantConfig
  return {
    ...defaultTenantConfig,
    ...preset,
    businessName: answers.businessName.trim(),
    businessType: answers.businessType,
    businessSubtype: answers.businessSubtype,
    locale: localeFromCountry(answers.countryCode) ?? preset.locale,
    features: { whatsapp: false },
    isDemo: false,
  }
}

/**
 * Guarda la config del onboarding en la fila creada por el alta y marca
 * `is_configured`. Update por `tenant_slug` (no upsert) para no tocar el `id`.
 */
export async function completeOnboarding(
  client: SupabaseClient,
  tenantSlug: string,
  config: TenantConfig
): Promise<void> {
  const { id: _id, tenant_slug: _slug, ...row } = mapConfigToRow(config, '', tenantSlug)

  const { data, error } = await client
    .from('tenant_settings')
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq('tenant_slug', tenantSlug)
    .select('id')

  if (error) throw new OnboardingError(error.message)
  // RLS filtra en silencio: 0 filas = sin permiso o sin fila del alta.
  if (!data || data.length === 0) {
    throw new OnboardingError('No pudimos guardar la configuración de tu negocio.')
  }
}

/** Equipo capturado en el onboarding. `tenant_id` explícito: el default de la columna es de ZM Lash. */
export async function insertOnboardingEmployees(
  client: SupabaseClient,
  tenantSlug: string,
  employees: readonly OnboardingEmployeeInput[]
): Promise<void> {
  const rows = employees
    .map((e) => ({ name: e.name.trim(), color: e.color, is_active: true, tenant_id: tenantSlug }))
    .filter((e) => e.name.length > 0)
  if (rows.length === 0) return

  const { error } = await client.from('employees').insert(rows)
  if (error) throw new OnboardingError(error.message)
}

/** Categorías de servicio elegidas en el onboarding, en el orden mostrado. */
export async function insertOnboardingServiceCategories(
  client: SupabaseClient,
  tenantSlug: string,
  names: readonly string[]
): Promise<void> {
  const rows = names
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name, index) => ({ name, order: index + 1, tenant_id: tenantSlug }))
  if (rows.length === 0) return

  const { error } = await client.from('service_categories').insert(rows)
  if (error) throw new OnboardingError(error.message)
}

export async function fetchOnboardingStatus(
  client: SupabaseClient,
  tenantSlug: string
): Promise<OnboardingStatus> {
  const [settings, tenant] = await Promise.all([
    client.from('tenant_settings').select('is_configured').eq('tenant_slug', tenantSlug).maybeSingle(),
    client
      .from('tenants')
      .select('owner_email_verified_at, subscription_status, trial_ends_at')
      .eq('id', tenantSlug)
      .maybeSingle(),
  ])

  if (settings.error) throw new OnboardingError(settings.error.message)
  if (tenant.error) throw new OnboardingError(tenant.error.message)

  return {
    // Sin fila = tenant legado configurado fuera del onboarding.
    isConfigured: settings.data ? settings.data.is_configured !== false : true,
    emailVerifiedAt: (tenant.data?.owner_email_verified_at as string | null) ?? null,
    subscriptionStatus: (tenant.data?.subscription_status as string | null) ?? null,
    trialEndsAt: (tenant.data?.trial_ends_at as string | null) ?? null,
  }
}

/** Envía el código de 6 dígitos (plantilla Magic Link de Supabase Auth con `{{ .Token }}`). */
export async function sendEmailVerificationCode(
  client: SupabaseClient,
  email: string
): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  })
  if (error) {
    if (error.status === 429) {
      throw new OnboardingError('Ya enviamos un código hace poco. Espera un minuto.', 429)
    }
    throw new OnboardingError('No pudimos enviar el código. Intenta de nuevo.', error.status)
  }
}

/** Valida el código y marca `tenants.owner_email_verified_at` (la RPC exige sesión por OTP). */
export async function verifyEmailCode(
  client: SupabaseClient,
  email: string,
  code: string
): Promise<string> {
  const token = code.replace(/\D/g, '')
  if (token.length !== 6) throw new OnboardingError('El código tiene 6 dígitos.')

  const { error } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: 'email',
  })
  if (error) throw new OnboardingError('El código no es válido o ya venció.', error.status)

  const { data, error: rpcError } = await client.rpc('mark_owner_email_verified')
  if (rpcError || typeof data !== 'string') {
    throw new OnboardingError('No pudimos confirmar tu correo. Intenta de nuevo.')
  }
  return data
}

/** Días de trial restantes (0 si venció; null si no está en trial). */
export function trialDaysLeft(status: OnboardingStatus, now: Date = new Date()): number | null {
  if (status.subscriptionStatus !== 'trial' || !status.trialEndsAt) return null
  const ms = new Date(status.trialEndsAt).getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}
