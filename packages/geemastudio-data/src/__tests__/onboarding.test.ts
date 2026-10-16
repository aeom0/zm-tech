import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import {
  OnboardingError,
  buildOnboardingConfig,
  completeOnboarding,
  fetchOnboardingStatus,
  insertOnboardingEmployees,
  insertOnboardingServiceCategories,
  signupTenant,
  trialDaysLeft,
  verifyEmailCode,
} from '../onboarding/onboardingService'

type Op = [string, ...unknown[]]
interface Call {
  table: string
  ops: Op[]
}

function fakeClient(respond: (call: Call) => unknown, extra: Record<string, unknown> = {}) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, ops: [] }
      calls.push(call)
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'insert', 'update', 'eq']) {
        q[m] = (...args: unknown[]) => {
          call.ops.push([m, ...args])
          return q
        }
      }
      q.maybeSingle = () => Promise.resolve(respond(call))
      q.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(respond(call)).then(resolve, reject)
      return q
    },
    ...extra,
  } as unknown as SupabaseClient
  return { client, calls }
}

describe('buildOnboardingConfig', () => {
  it('combina el preset del rubro con el locale del país', () => {
    const config = buildOnboardingConfig({
      businessName: '  Barbería Don Pepe ',
      businessType: 'barbershop',
      countryCode: 'CO',
    })
    expect(config.businessName).toBe('Barbería Don Pepe')
    expect(config.businessType).toBe('barbershop')
    expect(config.terminology.staff).toBe('barberos')
    expect(config.locale.currency.code).toBe('COP')
    expect(config.locale.timezone).toBe('America/Bogota')
    expect(config.isDemo).toBe(false)
  })

  it('usa el locale del preset si el país no existe', () => {
    const config = buildOnboardingConfig({
      businessName: 'Spa',
      businessType: 'spa-nails',
      countryCode: 'XX',
    })
    expect(config.locale.country).toBeTruthy()
  })
})

describe('completeOnboarding', () => {
  it('actualiza por tenant_slug sin tocar id y marca is_configured', async () => {
    const { client, calls } = fakeClient(() => ({ data: [{ id: 'row-1' }], error: null }))
    const config = buildOnboardingConfig({
      businessName: 'Studio',
      businessType: 'hair-salon',
      countryCode: 'PE',
    })
    await completeOnboarding(client, 'studio', config)

    const update = calls[0].ops.find((op) => op[0] === 'update')?.[1] as Record<string, unknown>
    expect(update.id).toBeUndefined()
    expect(update.tenant_slug).toBeUndefined()
    expect(update.is_configured).toBe(true)
    expect(update.currency_code).toBe('PEN')
    expect(calls[0].ops).toContainEqual(['eq', 'tenant_slug', 'studio'])
  })

  it('falla si RLS no actualizó ninguna fila', async () => {
    const { client } = fakeClient(() => ({ data: [], error: null }))
    const config = buildOnboardingConfig({
      businessName: 'Studio',
      businessType: 'hair-salon',
      countryCode: 'PE',
    })
    await expect(completeOnboarding(client, 'studio', config)).rejects.toBeInstanceOf(
      OnboardingError
    )
  })
})

describe('insertOnboardingEmployees', () => {
  it('envía tenant_id explícito y omite nombres vacíos', async () => {
    const { client, calls } = fakeClient(() => ({ error: null }))
    await insertOnboardingEmployees(client, 'studio', [
      { name: ' Ana ', color: '#fff' },
      { name: '  ', color: '#000' },
    ])
    expect(calls[0].ops[0]).toEqual([
      'insert',
      [{ name: 'Ana', color: '#fff', is_active: true, tenant_id: 'studio' }],
    ])
  })

  it('no consulta si no hay equipo', async () => {
    const { client, calls } = fakeClient(() => ({ error: null }))
    await insertOnboardingEmployees(client, 'studio', [])
    expect(calls).toHaveLength(0)
  })
})

describe('insertOnboardingServiceCategories', () => {
  it('ordena desde 1 y envía tenant_id explícito', async () => {
    const { client, calls } = fakeClient(() => ({ error: null }))
    await insertOnboardingServiceCategories(client, 'studio', ['Uñas', ' ', 'Pestañas'])
    expect(calls[0].table).toBe('service_categories')
    expect(calls[0].ops[0]).toEqual([
      'insert',
      [
        { name: 'Uñas', order: 1, tenant_id: 'studio' },
        { name: 'Pestañas', order: 2, tenant_id: 'studio' },
      ],
    ])
  })
})

describe('fetchOnboardingStatus', () => {
  it('combina tenant_settings y tenants', async () => {
    const { client } = fakeClient((call) =>
      call.table === 'tenant_settings'
        ? { data: { is_configured: false }, error: null }
        : {
            data: {
              owner_email_verified_at: null,
              subscription_status: 'trial',
              trial_ends_at: '2026-10-29T00:00:00Z',
            },
            error: null,
          }
    )
    const status = await fetchOnboardingStatus(client, 'studio')
    expect(status).toEqual({
      isConfigured: false,
      emailVerifiedAt: null,
      subscriptionStatus: 'trial',
      trialEndsAt: '2026-10-29T00:00:00Z',
    })
    expect(trialDaysLeft(status, new Date('2026-10-15T12:00:00Z'))).toBe(14)
    expect(trialDaysLeft(status, new Date('2026-11-15T00:00:00Z'))).toBe(0)
  })
})

describe('signupTenant', () => {
  it('devuelve el mensaje de error de la Edge Function', async () => {
    const { client } = fakeClient(() => null, {
      functions: {
        invoke: () =>
          Promise.resolve({
            data: null,
            error: {
              context: new Response(JSON.stringify({ error: 'Ya existe una cuenta con ese correo.' }), {
                status: 409,
              }),
            },
          }),
      },
    })
    const err = await signupTenant(client, {
      fullName: 'Ana',
      email: 'ana@test.com',
      password: '12345678',
      businessName: 'Studio',
    }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(OnboardingError)
    expect((err as OnboardingError).message).toBe('Ya existe una cuenta con ese correo.')
    expect((err as OnboardingError).status).toBe(409)
  })

  it('devuelve el slug creado', async () => {
    const { client } = fakeClient(() => null, {
      functions: { invoke: () => Promise.resolve({ data: { tenantSlug: 'studio' }, error: null }) },
    })
    await expect(
      signupTenant(client, { fullName: 'Ana', email: 'a@b.co', password: '12345678', businessName: 'Studio' })
    ).resolves.toEqual({ tenantSlug: 'studio' })
  })
})

describe('verifyEmailCode', () => {
  it('rechaza códigos que no tienen 6 dígitos sin llamar a Auth', async () => {
    const { client } = fakeClient(() => null, {
      auth: { verifyOtp: () => Promise.reject(new Error('no debería llamarse')) },
    })
    await expect(verifyEmailCode(client, 'a@b.co', '12 34')).rejects.toBeInstanceOf(OnboardingError)
  })

  it('verifica y marca el correo', async () => {
    const { client } = fakeClient(() => null, {
      auth: { verifyOtp: () => Promise.resolve({ error: null }) },
      rpc: () => Promise.resolve({ data: '2026-10-15T00:00:00Z', error: null }),
    })
    await expect(verifyEmailCode(client, 'a@b.co', '123 456')).resolves.toBe('2026-10-15T00:00:00Z')
  })
})
