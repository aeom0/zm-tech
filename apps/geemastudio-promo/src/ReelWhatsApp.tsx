import { linearTiming, TransitionSeries } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { useVideoConfig } from 'remotion'
import { AgendaScene } from './scenes/AgendaScene'
import { CtaScene } from './scenes/CtaScene'
import { FinanzasScene } from './scenes/FinanzasScene'
import { HookScene } from './scenes/HookScene'
import { WhatsAppScene, whatsAppSceneFrames } from './scenes/WhatsAppScene'

export const TRANSITION_FRAMES = 15

/** Duración de cada escena fija, en segundos (WhatsApp se calcula según la conversación). */
export const SCENE_S = { gancho: 3.2, agenda: 3.6, finanzas: 3.2, cierre: 3.6 }

/** Reel 9:16 (~24 s): mensajes acumulados → el asistente agenda → agenda → finanzas → CTA. */
export const ReelWhatsApp = () => {
  const { fps } = useVideoConfig()

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Gancho" durationInFrames={SCENE_S.gancho * fps} premountFor={fps}>
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-bottom' })}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />
      <TransitionSeries.Sequence
        name="WhatsApp"
        durationInFrames={whatsAppSceneFrames(fps)}
        premountFor={fps}
      >
        <WhatsAppScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />
      <TransitionSeries.Sequence name="Agenda" durationInFrames={SCENE_S.agenda * fps} premountFor={fps}>
        <AgendaScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />
      <TransitionSeries.Sequence name="Finanzas" durationInFrames={SCENE_S.finanzas * fps} premountFor={fps}>
        <FinanzasScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />
      <TransitionSeries.Sequence name="Cierre" durationInFrames={SCENE_S.cierre * fps} premountFor={fps}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  )
}

/** Duración total: suma de escenas menos el solape de las 4 transiciones. */
export function reelFrames(fps: number) {
  return Math.round((SCENE_S.gancho + SCENE_S.agenda + SCENE_S.finanzas + SCENE_S.cierre) * fps) + whatsAppSceneFrames(fps) - 4 * TRANSITION_FRAMES
}
