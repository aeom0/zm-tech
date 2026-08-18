import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { ensureValidAccessToken } from '../_shared/ml.ts'
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
    await requireStoreMember(admin, user.id, storeId)
    await ensureValidAccessToken(admin, storeId)

    const { data, error } = await admin
      .from('repmax_ml_connections')
      .select('status, expires_at, site_id')
      .eq('store_id', storeId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return jsonResponse({
      status: data?.status ?? 'active',
      expiresAt: data?.expires_at ?? null,
      siteId: data?.site_id ?? 'MLV',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo renovar el token.'
    return jsonResponse({ error: message }, 400)
  }
})
