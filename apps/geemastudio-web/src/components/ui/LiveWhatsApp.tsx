'use client'

import { useEffect, useState } from 'react'
import { CHAT, WhatsAppScreen } from '@geemastudio/mockups'

// Tiempos de la conversación simulada
const CLIENT_DELAY_MS = 1100
const TYPING_MS = 1300
const HOLD_MS = 5000

/** Reproduce la conversación de WhatsApp mensaje a mensaje, en loop. */
export function LiveWhatsApp() {
  const [visible, setVisible] = useState(0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(CHAT.length)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      })

    const play = async () => {
      while (!cancelled) {
        setVisible(0)
        setTyping(false)
        await wait(600)
        for (let i = 0; i < CHAT.length && !cancelled; i++) {
          if (CHAT[i].from === 'business') {
            setTyping(true)
            await wait(TYPING_MS)
            setTyping(false)
          } else {
            await wait(CLIENT_DELAY_MS)
          }
          if (!cancelled) setVisible(i + 1)
        }
        await wait(HOLD_MS)
      }
    }
    void play()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return <WhatsAppScreen visibleMessages={visible} typing={typing} animate />
}
