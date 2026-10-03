/** Planes Geema (Plan 17). Fuente de verdad: tabla `plans`; estos tipos reflejan sus filas vía PostgREST. */
export type PlanCode = 'basic' | 'pro' | 'elite'
export type BillingCycle = 'monthly' | 'annual'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled'

/** Fila de `public.plans`. `null` en max_* / waba_conversations = ilimitado. */
export interface Plan {
  code: PlanCode
  name: string
  description: string
  monthly_price: number
  annual_price: number
  max_branches: number | null
  max_staff: number | null
  waba_conversations: number | null
  features: string[]
  waba_features: string[]
  highlighted: boolean
  cta: string
  sort_order: number
}

/** Fila de la vista `public.tenant_subscription` (tenant del JWT + uso actual). */
export interface TenantSubscription {
  tenant_id: string
  plan_code: PlanCode
  billing_cycle: BillingCycle
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  plan_name: string
  monthly_price: number
  annual_price: number
  max_branches: number | null
  max_staff: number | null
  waba_conversations: number | null
  features: string[]
  waba_features: string[]
  staff_count: number
}

/**
 * Fila de la vista `public.tenant_waba_usage`: mensajes de servicio reales del mes en curso
 * (SERVICE/FREE_CUSTOMER_SERVICE; excluye FREE_ENTRY_POINT). `data_through` = último día sincronizado.
 */
export interface TenantWabaUsage {
  tenant_id: string
  month_start: string
  service_messages: number
  data_through: string | null
}

export interface PlanLimits {
  maxBranches: number | null
  maxStaff: number | null
  wabaConversations: number | null
}

export type UsageStatus = 'ok' | 'near' | 'over'

/** Porcentaje de uso desde el cual se avisa (sin bloquear). */
export const USAGE_WARN_THRESHOLD = 0.8

export function getPlanLimits(
  plan: Pick<Plan, 'max_branches' | 'max_staff' | 'waba_conversations'>,
): PlanLimits {
  return {
    maxBranches: plan.max_branches,
    maxStaff: plan.max_staff,
    wabaConversations: plan.waba_conversations,
  }
}

/**
 * Estado de uso frente a un límite. `limit = null` es ilimitado y siempre 'ok'.
 * 'near' desde el 80% (inclusive) hasta antes de superar el límite; 'over' cuando usage > limit.
 */
export function getUsageStatus(usage: number, limit: number | null): UsageStatus {
  if (limit === null) return 'ok'
  if (usage > limit) return 'over'
  if (limit > 0 && usage >= limit * USAGE_WARN_THRESHOLD) return 'near'
  return 'ok'
}

/** Menor plan que incluye cada función (aviso "disponible en X", nunca bloqueo duro). */
export type PlanFeature = 'inventory' | 'finances' | 'commissions' | 'push_clients' | 'advanced_reports' | 'custom_branding'

const PLAN_RANK: Record<PlanCode, number> = { basic: 1, pro: 2, elite: 3 }

const FEATURE_MIN_PLAN: Record<PlanFeature, PlanCode> = {
  inventory: 'pro',
  finances: 'pro',
  commissions: 'pro',
  push_clients: 'pro',
  advanced_reports: 'elite',
  custom_branding: 'elite',
}

export function getFeatureMinPlan(feature: PlanFeature): PlanCode {
  return FEATURE_MIN_PLAN[feature]
}

export function hasFeature(planCode: PlanCode, feature: PlanFeature): boolean {
  return PLAN_RANK[planCode] >= PLAN_RANK[FEATURE_MIN_PLAN[feature]]
}
