import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { mlSecrets } from '../_shared/env.ts'
import { authUrlForSite, siteIdFromCountry } from '../_shared/ml.ts'
import { signState } from '../_shared/state.ts'
import { adminClient, requireStoreMember, userFromJwt } from '../_shared/supabase.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Usa POST.' }, 405)
  }

  try {
    const user = await userFromJwt(req)
    const body = (await req.json()) as { storeId?: string }
    const storeId = body.storeId?.trim()
    if (!storeId) return jsonResponse({ error: 'Falta storeId.' }, 400)

    const admin = adminClient()
    const member = await requireStoreMember(admin, user.id, storeId, {
      ownerOnly: true,
    })

    const { data: mlAllowed, error: planError } = await admin.rpc('repmax_plan_allows', {
      p_store_id: storeId,
      p_feature: 'ml_catalog_export',
    })
    if (planError) throw new Error(planError.message)
    if (!mlAllowed) {
      return jsonResponse(
        { error: 'MercadoLibre entra en el plan Pro. Actualiza para conectar la cuenta.' },
        403
      )
    }

    const secrets = mlSecrets()
    const siteId = siteIdFromCountry(member.countryCode)
    const state = await signState(
      {
        storeId,
        userId: user.id,
        exp: Math.floor(Date.now() / 1000) + 300,
      },
      secrets.stateSecret
    )

    return jsonResponse({
      authUrl: authUrlForSite(siteId, secrets.clientId, secrets.redirectUri, state),
      siteId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo iniciar OAuth.'
    const status = message.includes('Falta el secret') ? 500 : 400
    return jsonResponse({ error: message }, status)
  }
})
