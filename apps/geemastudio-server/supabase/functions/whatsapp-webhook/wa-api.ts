// wa-api.ts — WhatsApp API helpers (credenciales por tenant)

const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0'

import { logOutMessage } from './lib/message-logger.ts'
import type { WaSendConfig } from './lib/tenant-config.ts'

export type OutLogger = (to: string, content: string, msg_type?: string) => void

export async function sendMessage(to: string, body: string, wa: WaSendConfig, log?: OutLogger) {
  const res = await fetch(`${WHATSAPP_API_URL}/${wa.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${wa.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[WABA] WhatsApp API sendMessage:', res.status, errText)
    throw new Error(`WhatsApp API ${res.status}: ${errText.slice(0, 200)}`)
  }
  log?.(to, body, 'text')
  logOutMessage(to, body, 'text')
}

export async function sendImage(
  to: string,
  imageUrl: string,
  wa: WaSendConfig,
  caption?: string,
  log?: OutLogger
) {
  const res = await fetch(`${WHATSAPP_API_URL}/${wa.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${wa.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption ? { caption: caption.slice(0, 1024) } : {}),
      },
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[WABA] WhatsApp API sendImage:', res.status, errText)
  } else {
    log?.(to, caption ? `[imagen] ${caption}` : '[imagen]', 'image')
    logOutMessage(to, caption ? `[imagen] ${caption}` : '[imagen]', 'image')
  }
}

export interface InteractiveListRow {
  id: string
  title: string
  description: string
}

export interface InteractiveListSection {
  title: string
  rows: InteractiveListRow[]
}

export function buildInteractiveList(
  header: string,
  body: string,
  buttonText: string,
  sections: InteractiveListSection[]
): Record<string, unknown> {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: header.slice(0, 60) },
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title.slice(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: (r.description ?? '').slice(0, 72),
          })),
        })),
      },
    },
  }
}

export async function sendInteractiveList(
  to: string,
  header: string,
  body: string,
  buttonText: string,
  sections: InteractiveListSection[],
  wa: WaSendConfig,
  log?: OutLogger
): Promise<boolean> {
  const payload = buildInteractiveList(header, body, buttonText, sections)
  const res = await fetch(`${WHATSAPP_API_URL}/${wa.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${wa.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, to }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[WABA] sendInteractiveList failed:', res.status, errText.slice(0, 300))
  } else {
    const logContent = `[lista] ${header}: ${body}`.slice(0, 300)
    log?.(to, logContent, 'interactive')
    logOutMessage(to, logContent, 'interactive')
  }
  return res.ok
}
