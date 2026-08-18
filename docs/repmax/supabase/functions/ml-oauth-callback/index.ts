import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { mlSecrets } from '../_shared/env.ts'
import { exchangeAuthorizationCode, siteIdFromCountry } from '../_shared/ml.ts'
import { verifyState } from '../_shared/state.ts'
import { adminClient, requireStoreMember } from '../_shared/supabase.ts'

const DEEP_LINK = 'repmax://ml-connected'

function redirect(status: 'success' | 'error', message?: string): Response {
  const url = new URL(DEEP_LINK)
  url.searchParams.set('status', status)
  if (message) url.searchParams.set('message', message)
  const location = url.toString()
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${location}">
<title>RepMAX</title></head>
<body>
<script>window.location.replace(${JSON.stringify(location)});</script>
<p>Listo. Vuelve a RepMAX.</p>
</body></html>`
  return new Response(html, {
    status: 302,
    headers: {
      Location: location,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return redirect('error', 'El callback OAuth solo acepta GET.')
  }

  try {
    const url = new URL(req.url)
    const mlError = url.searchParams.get('error')
    if (mlError) {
      return redirect(
        'error',
        url.searchParams.get('error_description') ?? 'Conexión cancelada en MercadoLibre.'
      )
    }

    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state) {
      return redirect('error', 'Faltan code o state en el callback.')
    }

    const secrets = mlSecrets()
    const payload = await verifyState(state, secrets.stateSecret)

    const admin = adminClient()
    const member = await requireStoreMember(admin, payload.userId, payload.storeId, {
      ownerOnly: true,
    })

    const tokens = await exchangeAuthorizationCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const siteId = siteIdFromCountry(member.countryCode)

    const { error } = await admin.from('repmax_ml_connections').upsert(
      {
        store_id: payload.storeId,
        ml_user_id: tokens.user_id,
        site_id: siteId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        status: 'active',
        connected_by: member.storeUserId,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' }
    )

    if (error) return redirect('error', error.message)
    return redirect('success')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo conectar MercadoLibre.'
    return redirect('error', message)
  }
})
