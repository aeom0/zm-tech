import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const leadSchema = z.object({
  source: z.enum(['manual', 'self-service']),
  slug: z.string().min(1).optional(),
  clienteNombre: z.string().optional(),
  clienteContacto: z.string().optional(),
  serviceIds: z.array(z.string().min(1)).min(1),
  result: z.object({
    subtotal: z.number(),
    descuento: z.number(),
    total: z.number(),
    requiereContactoDirecto: z.boolean(),
  }),
})

/**
 * Registra un lead de cotización. Nunca bloquea el flujo de WhatsApp:
 * errores de DB se loguean y se responde { ok: true } igual.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const parsed = leadSchema.safeParse(body)

    if (!parsed.success) {
      console.error('[cotizador/lead] payload inválido', parsed.error.flatten())
      // No rompemos UX del CTA
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const data = parsed.data
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      console.error('[cotizador/lead] faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const supabase = createClient(url, key)

    const { error } = await supabase.from('quote_leads').insert([
      {
        source: data.source,
        slug: data.source === 'manual' ? (data.slug ?? null) : null,
        cliente_nombre: data.clienteNombre?.trim() || null,
        cliente_contacto: data.clienteContacto?.trim() || null,
        service_ids: data.serviceIds,
        subtotal: data.result.requiereContactoDirecto ? null : data.result.subtotal,
        descuento: data.result.requiereContactoDirecto ? null : data.result.descuento,
        total: data.result.requiereContactoDirecto ? null : data.result.total,
        requiere_contacto_directo: data.result.requiereContactoDirecto,
        status: 'nuevo',
      },
    ])

    if (error) {
      console.error('[cotizador/lead] insert falló', error)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[cotizador/lead]', err)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
