'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getUsageStatus,
  hasFeature,
  type PlanFeature,
  type UsageStatus,
} from '@geemastudio/shared-schema'

import { fetchPublicPlans, fetchTenantSubscription } from './planService'
import { supabase } from '@/lib/supabase'

export const WEB_TENANT_SUBSCRIPTION_KEY = ['web_tenant_subscription'] as const

export function useTenantSubscription() {
  return useQuery({
    queryKey: WEB_TENANT_SUBSCRIPTION_KEY,
    queryFn: fetchTenantSubscription,
    enabled: !!supabase,
    staleTime: 60_000,
  })
}

export function usePublicPlans() {
  return useQuery({
    queryKey: ['web_public_plans'],
    queryFn: fetchPublicPlans,
    enabled: !!supabase,
    staleTime: 5 * 60_000,
  })
}

/** Plan del tenant, uso frente a límites y acceso a funciones. Solo informa: nunca bloquea. */
export function usePlan() {
  const query = useTenantSubscription()
  const sub = query.data ?? null

  const staffStatus: UsageStatus = sub ? getUsageStatus(sub.staff_count, sub.max_staff) : 'ok'

  return {
    ...query,
    subscription: sub,
    staffStatus,
    can: (feature: PlanFeature) => (sub ? hasFeature(sub.plan_code, feature) : true),
  }
}
