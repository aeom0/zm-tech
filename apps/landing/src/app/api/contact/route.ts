import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'

const schema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().min(2),
  whatsapp: z.string().min(7),
  presupuesto: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: dbError } = await supabase
      .from('contacts')
      .insert([data])

    if (dbError) {
      console.error('[Supabase]', dbError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY!)

    await resend.emails.send({
      from: 'ZM Tech <onboarding@resend.dev>',
      to: [process.env.CONTACT_EMAIL ?? 'albertoorta.1@gmail.com'],
      subject: `Nuevo lead: ${data.nombre} — ${data.empresa}`,
      html: `
        <div style="font-family: monospace; background: #050505; color: #fff; padding: 32px; border-radius: 8px;">
          <h2 style="color: #8b5cf6; margin: 0 0 24px;">ZM Tech — Nuevo Lead</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #6b7280; padding: 8px 0;">Nombre</td><td style="color: #fff;">${data.nombre}</td></tr>
            <tr><td style="color: #6b7280; padding: 8px 0;">Empresa</td><td style="color: #fff;">${data.empresa}</td></tr>
            <tr><td style="color: #6b7280; padding: 8px 0;">WhatsApp</td><td style="color: #fff;">${data.whatsapp}</td></tr>
            <tr><td style="color: #6b7280; padding: 8px 0;">Presupuesto</td><td style="color: #fff;">${data.presupuesto}</td></tr>
            <tr><td style="color: #6b7280; padding: 8px 0;">Fecha</td><td style="color: #fff;">${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}</td></tr>
          </table>
        </div>
      `,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: err.issues }, { status: 422 })
    }
    console.error('[contact route]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
