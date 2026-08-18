// State OAuth firmado con HMAC-SHA256. Secret propio (ML_OAUTH_STATE_SECRET),
// NUNCA reutilizar SUPABASE_JWT_SECRET.

export interface OauthStatePayload {
  storeId: string
  userId: string
  exp: number
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const bin = atob(padded + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i]
  return out === 0
}

export async function signState(payload: OauthStatePayload, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(sig))}`
}

export async function verifyState(state: string, secret: string): Promise<OauthStatePayload> {
  const [body, sig] = state.split('.')
  if (!body || !sig) throw new Error('State OAuth inválido.')

  const key = await hmacKey(secret)
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))
  if (!timingSafeEqual(expected, fromBase64Url(sig))) {
    throw new Error('Firma del state OAuth inválida.')
  }

  const json = new TextDecoder().decode(fromBase64Url(body))
  const payload = JSON.parse(json) as OauthStatePayload
  if (!payload.storeId || !payload.userId || typeof payload.exp !== 'number') {
    throw new Error('State OAuth incompleto.')
  }
  if (payload.exp * 1000 < Date.now()) {
    throw new Error('El state OAuth expiró. Intenta conectar de nuevo.')
  }
  return payload
}
