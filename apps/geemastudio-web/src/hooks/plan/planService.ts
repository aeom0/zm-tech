'use client'

import type { Plan, TenantSubscription } from '@geemastudio/shared-schema'

import { supabase } from '@/lib/supabase'

/** Suscripción del tenant de la sesión (vista tenant_subscription, filtrada por JWT). */
export async function fetchTenantSubscription(): Promise<TenantSubscription | null> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase
    .from('tenant_subscription')
    .select('*')
    .maybeSingle<TenantSubscription>()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchPublicPlans(): Promise<Plan[]> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_public', true)
    .order('sort_order')
    .returns<Plan[]>()
  if (error) throw new Error(error.message)
  return data ?? []
}
