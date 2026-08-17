/**
 * Correo público ZM Tech. MX del dominio va por ImprovMX
 * (forward hacia el inbox de Alberto). No hace falta CONTACT_EMAIL en Vercel.
 */
export const CONTACTO_ZMTECH = 'alberto@zmtechdev.com'

/** Remitente sandbox de Resend hasta verificar el dominio para envío. */
export const REMITENTE_RESEND = 'ZM Tech <onboarding@resend.dev>'

export async function enviarAvisoInterno(params: {
  subject: string
  html: string
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] Sin RESEND_API_KEY — el aviso no se envió. El lead sí puede haberse guardado.')
    return { ok: false, error: 'RESEND_API_KEY ausente' }
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: REMITENTE_RESEND,
    to: [CONTACTO_ZMTECH],
    subject: params.subject,
    html: params.html,
  })

  if (error) {
    console.error('[email] Resend:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true, id: data?.id }
}
