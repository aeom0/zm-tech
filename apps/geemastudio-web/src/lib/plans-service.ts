// Planes de la landing de Geema (Plan 17): lee `plans` con cliente anon; si falla, usa PLANS de constants.ts.

import { createClient } from '@supabase/supabase-js'
import type { Plan as PlanRow } from '@geemastudio/shared-schema'
import { PLANS, type Plan } from '@/lib/constants'

const PLANS_SELECT =
  'code, name, description, monthly_price, annual_price, waba_conversations, features, waba_features, highlighted, cta, sort_order'

type PlanDbRow = Pick<
  PlanRow,
  | 'code'
  | 'name'
  | 'description'
  | 'monthly_price'
  | 'annual_price'
  | 'waba_conversations'
  | 'features'
  | 'waba_features'
  | 'highlighted'
  | 'cta'
>

function toLandingPlan(row: PlanDbRow): Plan {
  return {
    name: row.name,
    monthlyPrice: row.monthly_price,
    annualPrice: row.annual_price,
    description: row.description,
    features: row.features,
    wabaFeatures: row.waba_features,
    wabaConversations: row.waba_conversations ?? 'unlimited',
    highlighted: row.highlighted,
    cta: row.cta,
    ctaSecondary: row.code === 'elite',
  }
}

export async function getLandingPlans(): Promise<Plan[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return PLANS

  try {
    const { data, error } = await createClient(url, anonKey)
      .from('plans')
      .select(PLANS_SELECT)
      .eq('is_public', true)
      .order('sort_order')
      .returns<PlanDbRow[]>()

    if (error || !data || data.length === 0) return PLANS
    return data.map(toLandingPlan)
  } catch {
    return PLANS
  }
}
