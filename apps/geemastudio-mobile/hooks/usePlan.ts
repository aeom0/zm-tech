import { useQuery } from '@tanstack/react-query'
import {
  getUsageStatus,
  hasFeature,
  type Plan,
  type PlanFeature,
  type TenantSubscription,
  type TenantWabaUsage,
  type UsageStatus,
} from '@geemastudio/shared-schema'

import { supabase } from '@/lib/supabase'

export const TENANT_SUBSCRIPTION_KEY = ['tenant-subscription'] as const

async function fetchTenantSubscription(): Promise<TenantSubscription | null> {
  const { data, error } = await supabase
    .from('tenant_subscription')
    .select('*')
    .maybeSingle<TenantSubscription>()
  if (error) throw new Error(error.message)
  return data
}

async function fetchPublicPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_public', true)
    .order('sort_order')
    .returns<Plan[]>()
  if (error) throw new Error(error.message)
  return data ?? []
}

async function fetchWabaUsage(): Promise<TenantWabaUsage | null> {
  const { data, error } = await supabase
    .from('tenant_waba_usage')
    .select('*')
    .maybeSingle<TenantWabaUsage>()
  if (error) throw new Error(error.message)
  return data
}

export function useWabaUsage() {
  return useQuery({
    queryKey: ['waba-usage'],
    queryFn: fetchWabaUsage,
    staleTime: 5 * 60_000,
  })
}

export function usePublicPlans() {
  return useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPublicPlans,
    staleTime: 5 * 60_000,
  })
}

/**
 * Plan del tenant y uso frente a límites. Solo informa: nunca bloquea.
 * `staffCount` permite pasar el conteo local de profesionales activos (más fresco que la vista).
 */
export function usePlan(options?: { staffCount?: number }) {
  const query = useQuery({
    queryKey: TENANT_SUBSCRIPTION_KEY,
    queryFn: fetchTenantSubscription,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const subscription = query.data ?? null
  const staffCount = options?.staffCount ?? subscription?.staff_count ?? 0
  const staffStatus: UsageStatus = subscription
    ? getUsageStatus(staffCount, subscription.max_staff)
    : 'ok'

  const wabaUsage = useWabaUsage().data ?? null
  const wabaStatus: UsageStatus =
    subscription && wabaUsage ? getUsageStatus(wabaUsage.service_messages, subscription.waba_conversations) : 'ok'

  return {
    ...query,
    subscription,
    wabaUsage,
    wabaStatus,
    staffCount,
    staffStatus,
    can: (feature: PlanFeature) => (subscription ? hasFeature(subscription.plan_code, feature) : true),
  }
}
