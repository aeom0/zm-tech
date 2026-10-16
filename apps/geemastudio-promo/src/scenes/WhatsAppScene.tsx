import { CHAT, WhatsAppScreen } from '@geemastudio/mockups'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, FONT } from '../brand'
import { Backdrop } from '../components/Backdrop'
import { Headline } from '../components/Headline'
import { Phone } from '../components/Phone'

// Tiempos de la conversación, en segundos desde el inicio de la escena
const FIRST_MESSAGE_S = 0.8
const CLIENT_GAP_S = 1.3
const TYPING_S = 1.3
const ENTER_S = 0.35
const HOLD_S = 2.6

type Step = { at: number; typingFrom?: number }

/** Calcula cuándo aparece cada mensaje: la clienta escribe y el asistente «escribe…» antes de responder. */
function schedule(fps: number): Step[] {
  const steps: Step[] = []
  let t = FIRST_MESSAGE_S
  CHAT.forEach((m, i) => {
    if (i > 0) t += m.from === 'business' ? TYPING_S : CLIENT_GAP_S
    steps.push({ at: t * fps, typingFrom: m.from === 'business' ? (t - TYPING_S) * fps : undefined })
    t += ENTER_S
  })
  return steps
}

/** Escena estrella: el asistente de WhatsApp atiende, cotiza y agenda solo. */
export const WhatsAppScene = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const steps = schedule(fps)

  const visible = steps.filter((s) => frame >= s.at).length
  const next = steps[visible]
  const typing = next?.typingFrom !== undefined && frame >= next.typingFrom
  const enterFrom = typing ? next.typingFrom! : steps[visible - 1]?.at ?? 0
  const enterProgress = interpolate(frame, [enterFrom, enterFrom + ENTER_S * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const done = visible === CHAT.length
  const seal = done ? enterProgress : 0

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop accent={BRAND.whatsapp} />
      <AbsoluteFill style={{ opacity: 1 - seal }}>
        <Headline text="Tu asistente responde por ti, 24/7" highlight="24/7" top={140} />
      </AbsoluteFill>
      <Phone glow={BRAND.whatsapp} top={430} statusBarColor="#E9EDEF" screenBackground="#0B141A">
        <WhatsAppScreen
          visibleMessages={visible}
          typing={typing}
          enterProgress={enterProgress}
          typingPhase={(frame / fps) % 1}
        />
      </Phone>

      {/* Sello final: reemplaza al titular para no tapar el teléfono */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 190,
          display: 'flex',
          justifyContent: 'center',
          opacity: seal,
          scale: interpolate(seal, [0, 1], [0.85, 1]),
        }}
      >
        <div
          style={{
            padding: '26px 44px',
            textAlign: 'center',
            borderRadius: 999,
            backgroundColor: BRAND.whatsapp,
            color: '#0B141A',
            fontSize: 50,
            fontWeight: 800,
            lineHeight: 1.15,
            boxShadow: `0 20px 60px ${BRAND.whatsapp}66`,
          }}
        >
          Cita agendada
          <br />
          sin que muevas un dedo
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** Duración natural de la escena: la conversación completa + una pausa para leer. */
export function whatsAppSceneFrames(fps: number) {
  const last = schedule(fps).at(-1)!.at
  return Math.ceil(last + ENTER_S * fps + HOLD_S * fps)
}
