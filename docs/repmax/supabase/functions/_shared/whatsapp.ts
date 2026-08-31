import { whatsappSecrets } from './env.ts'

const GRAPH_VERSION = 'v20.0'

export async function sendWhatsAppMessage(payload: Record<string, unknown>): Promise<void> {
  const { token, phoneNumberId } = whatsappSecrets()
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WhatsApp API respondió ${res.status}: ${body.slice(0, 300)}`)
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await sendWhatsAppMessage({
    to,
    type: 'text',
    text: { body },
  })
}
