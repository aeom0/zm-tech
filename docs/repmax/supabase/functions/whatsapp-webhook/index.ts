import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'
import { whatsappSecrets } from '../_shared/env.ts'
import { classifyWaIntent, type WaIntent } from '../_shared/haikuIntent.ts'
import { adminClient } from '../_shared/supabase.ts'
import { sendWhatsAppText } from '../_shared/whatsapp.ts'

// Fase 0 — prototipo interno/demo en sandbox de Meta (plan 10, sección 5).
// Single-tenant: todo mensaje entrante se asocia a WHATSAPP_DEMO_STORE_ID.
// No hay handoff real, ni cotización/pagos — eso es Fase 1+.

interface WaTextMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
}

function extractMessage(body: unknown): WaTextMessage | null {
  const entry = (body as { entry?: unknown[] })?.entry?.[0] as
    | { changes?: unknown[] }
    | undefined
  const change = entry?.changes?.[0] as { value?: { messages?: WaTextMessage[] } } | undefined
  return change?.value?.messages?.[0] ?? null
}

async function findOrCreateConversation(admin: SupabaseClient, storeId: string, phone: string) {
  const { data, error } = await admin
    .from('repmax_wa_conversations')
    .upsert(
      { store_id: storeId, phone },
      { onConflict: 'store_id,phone', ignoreDuplicates: false }
    )
    .select('id, bot_paused_at')
    .single()

  if (error) throw new Error(error.message)
  return data as { id: string; bot_paused_at: string | null }
}

async function logMessage(
  admin: SupabaseClient,
  conversationId: string,
  fields: {
    wamid?: string
    direction: 'in' | 'out'
    content: string
    intent?: string | null
  }
) {
  await admin.from('repmax_wa_messages').insert({
    conversation_id: conversationId,
    wamid: fields.wamid,
    direction: fields.direction,
    content: fields.content,
    intent: fields.intent ?? null,
  })
}

async function replyForConsultarProducto(
  admin: SupabaseClient,
  storeId: string,
  text: string
): Promise<string> {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    // PostgREST usa , . ( ) * " como sintaxis de filtro — solo dejamos
    // letras/números para que el texto libre del cliente no pueda inyectar
    // condiciones fuera de las columnas pensadas.
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((w) => w.length >= 4)
    .slice(0, 4)

  if (words.length === 0) {
    return 'Contame qué repuesto buscás (marca, modelo y pieza) y te digo si lo tenemos.'
  }

  const orFilter = words
    .map((w) => `title.ilike.%${w}%,brand.ilike.%${w}%,model.ilike.%${w}%,part_number.ilike.%${w}%`)
    .join(',')

  const { data, error } = await admin
    .from('repmax_products')
    .select('title, brand, model, price_usd, stock')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .or(orFilter)
    .order('stock', { ascending: false })
    .limit(3)

  if (error || !data || data.length === 0) {
    return 'No encontré esa pieza en el catálogo todavía. En breve te contacta un vendedor para confirmarte disponibilidad.'
  }

  const lines = data.map(
    (p) => `• ${p.title} (${p.brand} ${p.model}) — $${p.price_usd}${p.stock > 0 ? '' : ' (sin stock)'}`
  )
  return `Encontré esto:\n${lines.join('\n')}\n\n¿Querés que te confirme disponibilidad con un vendedor?`
}

function replyFor(intent: WaIntent): string | null {
  switch (intent) {
    case 'saludo':
      return 'Hola! Soy el asistente de repuestos. Contame qué pieza buscás (marca, modelo, año) o escribí "vendedor" si querés hablar con alguien del equipo.'
    case 'hablar_con_vendedor':
      return 'Listo, en breve te contacta un vendedor del equipo.'
    case 'otro':
      return 'No te entendí bien. Contame qué repuesto buscás o escribí "vendedor" para hablar con alguien.'
    default:
      return null // consultar_producto se resuelve aparte (necesita el catálogo)
  }
}

async function processMessage(admin: SupabaseClient, body: unknown): Promise<void> {
  const message = extractMessage(body)
  if (!message || message.type !== 'text' || !message.text?.body) return

  const { demoStoreId } = whatsappSecrets()
  const phone = message.from
  const text = message.text.body

  // Dedupe: reintentos de Meta traen el mismo wamid.
  const { data: existing } = await admin
    .from('repmax_wa_messages')
    .select('id')
    .eq('wamid', message.id)
    .maybeSingle()
  if (existing) return

  const conversation = await findOrCreateConversation(admin, demoStoreId, phone)
  if (conversation.bot_paused_at) {
    await logMessage(admin, conversation.id, { wamid: message.id, direction: 'in', content: text })
    return
  }

  const intent = await classifyWaIntent(text)
  await logMessage(admin, conversation.id, {
    wamid: message.id,
    direction: 'in',
    content: text,
    intent,
  })

  const reply =
    intent === 'consultar_producto'
      ? await replyForConsultarProducto(admin, demoStoreId, text)
      : replyFor(intent)

  if (!reply) return

  await sendWhatsAppText(phone, reply)
  await logMessage(admin, conversation.id, { direction: 'out', content: reply })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse()

  const url = new URL(req.url)

  if (req.method === 'GET') {
    const { verifyToken } = whatsappSecrets()
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 })
    }
    return jsonResponse({ error: 'Verificación inválida.' }, 403)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Usa GET (verify) o POST.' }, 405)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Body inválido.' }, 400)
  }

  const admin = adminClient()
  const task = processMessage(admin, body).catch((err) => {
    console.error('whatsapp-webhook processMessage error:', err)
  })

  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } })
    .EdgeRuntime
  if (edgeRuntime) {
    edgeRuntime.waitUntil(task)
  }
  // Sin EdgeRuntime disponible, la promesa igual corre en background;
  // no se espera aquí para no demorar el 200 a Meta.

  return jsonResponse({ status: 'ok' })
})
