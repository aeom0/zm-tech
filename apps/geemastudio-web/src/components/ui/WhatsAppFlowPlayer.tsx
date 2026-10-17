'use client'

import { useEffect, useRef } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import {
  FLOW,
  WhatsAppAgendaFlow,
  whatsAppAgendaFlowFrames,
} from '@/remotion/WhatsAppAgendaFlow'

const DURATION = whatsAppAgendaFlowFrames(FLOW.fps)

/** Video en loop de la conversación de WhatsApp que termina en la agenda; solo corre en pantalla. */
export function WhatsAppFlowPlayer() {
  const playerRef = useRef<PlayerRef>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const player = playerRef.current
    const wrapper = wrapperRef.current
    if (!player || !wrapper) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      player.seekTo(DURATION - Math.round(FLOW.fps * 1.5))
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) player.play()
        else player.pause()
      },
      { threshold: 0.25 },
    )
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={wrapperRef}
      role="img"
      aria-label="Una clienta pide cita por WhatsApp, el asistente le ofrece horarios, la confirma y la cita aparece en la agenda del salón"
      className="w-full"
      style={{ aspectRatio: `${FLOW.width} / ${FLOW.height}` }}
    >
      <Player
        ref={playerRef}
        component={WhatsAppAgendaFlow}
        durationInFrames={DURATION}
        compositionWidth={FLOW.width}
        compositionHeight={FLOW.height}
        fps={FLOW.fps}
        loop
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        spaceKeyToPlayOrPause={false}
        acknowledgeRemotionLicense
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
