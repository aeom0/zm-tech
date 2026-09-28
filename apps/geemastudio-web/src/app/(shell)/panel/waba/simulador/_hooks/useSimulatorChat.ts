'use client'

import { useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase'

export type SimulatorUser = 'alberto' | 'vanessa'

/** Boilerplate CTWA Set 2026 — debe coincidir con el Edge `waba-chat-simulator`. */
export const DEFAULT_CTWA_BOILERPLATE_TEXT =
  '¡Hola! Quiero despertar con una Mirada Espectacular 💜'

export type SimulatorBubble = {
  id: string
  role: 'user' | 'bot'
  content: string
  msg_type?: string | null
  image_url?: string | null
  created_at: string
  interactiveId?: string
  fromAd?: boolean
}

type OutBubbleApi = {
  id: string
  content: string
  msg_type: string | null
  image_url: string | null
  created_at: string
}

type InvokeResult = {
  ok?: boolean
  error?: string
  detail?: string
  phone?: string
  user?: SimulatorUser
  contactName?: string
  inboundPreview?: string
  fromAd?: boolean
  bubbles?: OutBubbleApi[]
}

export type SendTextOptions = {
  fromAdSimulated?: boolean
  referralHeadline?: string | null
}

async function invokeSimulator(body: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase no está configurado')

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session?.access_token) {
    throw new Error('Sesión no encontrada. Vuelve a iniciar sesión.')
  }

  const { data, error } = await supabase.functions.invoke<InvokeResult>('waba-chat-simulator', {
    body,
  })

  if (error) {
    let msg = error.message
    const ctx = error.context as { body?: string } | undefined
    if (ctx?.body) {
      try {
        const parsed = JSON.parse(ctx.body) as { error?: string; detail?: string }
        if (parsed?.detail) msg = parsed.detail
        else if (parsed?.error) msg = parsed.error
      } catch {
        /* usar message por defecto */
      }
    }
    if (/failed to send a request to the edge function/i.test(msg)) {
      msg =
        'No se pudo conectar con el simulador. Revisa tu conexión o vuelve a intentar en unos segundos.'
    } else if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      msg = 'Sin conexión. Revisa internet e intenta de nuevo.'
    }
    throw new Error(msg || 'No se pudo usar el simulador')
  }

  if (data && typeof data === 'object' && data.error) {
    throw new Error(String(data.detail || data.error))
  }
  if (data && data.ok === false && data.detail) {
    throw new Error(String(data.detail))
  }

  return data ?? {}
}

export function useSimulatorChat() {
  const [user, setUser] = useState<SimulatorUser | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<SimulatorBubble[]>([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bootRef = useRef(false)

  const startSession = async (nextUser: SimulatorUser) => {
    setError(null)
    setStarting(true)
    try {
      const data = await invokeSimulator({
        action: 'start_session',
        user: nextUser,
      })
      setUser(nextUser)
      setPhone(data.phone ?? null)
      setMessages([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar')
    } finally {
      setStarting(false)
    }
  }

  const resetConversation = async () => {
    if (!phone) return
    setError(null)
    setLoading(true)
    try {
      await invokeSimulator({ action: 'reset_session', phone })
      setMessages([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reiniciar')
    } finally {
      setLoading(false)
    }
  }

  const sendText = async (text: string, opts: SendTextOptions = {}) => {
    const trimmed = text.trim()
    const fromAd = opts.fromAdSimulated === true
    if (!phone || loading) return
    if (!trimmed && !fromAd) return

    setError(null)
    setLoading(true)

    const displayText = trimmed || DEFAULT_CTWA_BOILERPLATE_TEXT
    const localId = `local-${Date.now()}`
    const now = new Date().toISOString()
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        role: 'user',
        content: displayText,
        msg_type: 'text',
        created_at: now,
        fromAd,
      },
    ])

    try {
      const data = await invokeSimulator({
        action: 'send_message',
        phone,
        text: trimmed || undefined,
        fromAdSimulated: fromAd || undefined,
        referralHeadline: fromAd ? (opts.referralHeadline ?? 'Mirada Espectacular') : undefined,
      })
      const botBubbles: SimulatorBubble[] = (data.bubbles ?? []).map((b) => ({
        id: b.id,
        role: 'bot',
        content: b.content ?? '',
        msg_type: b.msg_type,
        image_url: b.image_url,
        created_at: b.created_at,
      }))
      setMessages((prev) => [...prev, ...botBubbles])
      if (botBubbles.length === 0) {
        setError(
          'El bot no respondió esta vez. Vuelve a enviar el mensaje o reinicia la conversación.',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    } finally {
      setLoading(false)
    }
  }

  const sendInteractive = async (interactiveId: string, title?: string) => {
    const id = interactiveId.trim()
    if (!phone || !id || loading) return
    setError(null)
    setLoading(true)

    const label = (title ?? id).trim() || id
    const localId = `local-tap-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        role: 'user',
        content: label,
        msg_type: 'interactive',
        interactiveId: id,
        created_at: new Date().toISOString(),
      },
    ])

    try {
      const data = await invokeSimulator({
        action: 'send_message',
        phone,
        interactiveId: id,
        interactiveTitle: label,
      })
      const botBubbles: SimulatorBubble[] = (data.bubbles ?? []).map((b) => ({
        id: b.id,
        role: 'bot',
        content: b.content ?? '',
        msg_type: b.msg_type,
        image_url: b.image_url,
        created_at: b.created_at,
      }))
      setMessages((prev) => [...prev, ...botBubbles])
      if (botBubbles.length === 0) {
        setError('El bot no respondió a esa opción. Prueba otra o reinicia la conversación.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la opción')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bootRef.current) return
    bootRef.current = true
    void startSession('alberto')
  }, [])

  return {
    user,
    phone,
    messages,
    loading,
    starting,
    error,
    startSession,
    resetConversation,
    sendText,
    sendInteractive,
    clearError: () => setError(null),
  }
}
