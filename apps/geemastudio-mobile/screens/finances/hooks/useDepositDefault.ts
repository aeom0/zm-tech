import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

/** Adelanto fijo configurado en Reglas del asistente (`tenant_settings.waba_rules.deposit.fixedAmount`). */
async function fetchDepositFixedAmount(tenantId: string): Promise<number | null> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('waba_rules')
    .eq('tenant_slug', tenantId)
    .maybeSingle()
  const rules = data?.waba_rules as { deposit?: { fixedAmount?: unknown } } | null | undefined
  const amount = rules?.deposit?.fixedAmount
  return typeof amount === 'number' && amount > 0 ? amount : null
}

/** Monto sugerido para el chip «Adelanto»; `null` si el negocio no tiene uno configurado. */
export function useDepositDefault(tenantId: string | null) {
  const query = useQuery({
    queryKey: ['tenant_settings', 'deposit_fixed_amount', tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
    queryFn: () => fetchDepositFixedAmount(tenantId as string),
  })
  return query.data ?? null
}
