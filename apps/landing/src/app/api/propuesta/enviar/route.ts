import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const PROPUESTA_URL = 'https://zmtech-landing.vercel.app/propuesta/guataparo'
// Botones de contacto apuntan a ZM Tech (Alberto), no a la clienta
const WA_ZM = 'https://wa.me/584144940417'

export async function POST() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const { data, error } = await resend.emails.send({
      from: 'ZM Tech <onboarding@resend.dev>',
      to: ['albertoorta.1@gmail.com'],
      subject: '🏠 Tu propuesta personalizada — Guataparo Bienes Raíces',
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Propuesta ZM Tech</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">

    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;background:#050505;border-radius:10px;padding:8px 18px">
        <span style="color:#8b5cf6;font-weight:700;font-size:15px">ZM</span>
        <span style="color:#fff;font-weight:700;font-size:15px"> Tech</span>
      </div>
    </div>

    <div style="background:#1a3c5e;border-radius:14px;padding:28px 24px;margin-bottom:16px;text-align:center">
      <p style="font-size:22px;font-weight:700;color:#fff;margin:0 0 8px">Hola, Morelba 👋</p>
      <p style="font-size:15px;color:rgba(255,255,255,.8);margin:0;line-height:1.6">
        Preparamos una propuesta personalizada para <strong style="color:#c9a84c">Guataparo Bienes Raíces</strong>.
        Tarda menos de 2 minutos leerla.
      </p>
    </div>

    <div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;text-align:center;border:1px solid #e5e5e5">
      <p style="font-size:14px;color:#555;margin:0 0 16px;line-height:1.6">
        Hicimos los cálculos: con tu propia plataforma web pagarías
        <strong style="color:#1a3c5e">~$360/año</strong> en lugar de los
        <strong style="color:#a32d2d">~$700/año</strong> que cuesta Wasi.
        Y el sitio sería completamente tuyo.
      </p>
      <a href="${PROPUESTA_URL}" style="display:inline-block;background:#1a3c5e;color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;text-decoration:none">
        Ver mi propuesta completa →
      </a>
      <p style="font-size:11px;color:#aaa;margin:12px 0 0">${PROPUESTA_URL}</p>
    </div>

    <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;border:1px solid #e5e5e5">
      <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">Resumen rápido</p>
      ${
        [
          ['🌐', 'Página web profesional de tu agencia', '$300 USD inversión inicial'],
          ['🎁', 'Dominio incluido el primer año', 'Valor $35, sin costo extra'],
          ['🔧', 'Soporte y mejoras mensuales', '$30 / mes'],
          ['📈', 'Recuperas la inversión en', '~10 meses'],
        ].map(([icon, title, sub]) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid #f5f5f5">
            <span style="font-size:18px;flex-shrink:0">${icon}</span>
            <div style="flex:1">
              <p style="font-size:13px;font-weight:500;color:#111;margin:0 0 2px">${title}</p>
              <p style="font-size:12px;color:#888;margin:0">${sub}</p>
            </div>
          </div>
        `).join('')
      }
    </div>

    <div style="text-align:center;margin-bottom:24px">
      <p style="font-size:13px;color:#666;margin:0 0 12px">¿Tienes alguna pregunta? Escríbenos directo:</p>
      <a href="${WA_ZM}" style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">
        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Hablar por WhatsApp
      </a>
    </div>

    <p style="text-align:center;font-size:11px;color:#bbb;margin:0">
      ZM Tech · zmtech-landing.vercel.app<br>
      Esta propuesta tiene validez de 15 días · Abril 2026
    </p>

  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Error enviando propuesta:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
