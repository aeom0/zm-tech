'use client'

import type { Plan, TenantSubscription, TenantWabaUsage } from '@geemastudio/shared-schema'

import { supabase } from '@/lib/supabase'

/** Suscripción del tenant de la sesión (vista tenant_subscription, filtrada por JWT). */
export async function fetchTenantSubscription(): Promise<TenantSubscription | null> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  const { data, error } = await supabase
    .from('tenant_subscription')
    .select('*')
    .maybeSingle<TenantSubscription>()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchPublicPlans(): Promise<Plan[]> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_public', true)
    .order('sort_order')
    .returns<Plan[]>()
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Mensajes de servicio WABA del mes (vista tenant_waba_usage). Solo owner/dev ven datos; otros roles ven 0. */
export async function fetchWabaUsage(): Promise<TenantWabaUsage | null> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  const { data, error } = await supabase
    .from('tenant_waba_usage')
    .select('*')
    .maybeSingle<TenantWabaUsage>()
  if (error) throw new Error(error.message)
  return data
}
