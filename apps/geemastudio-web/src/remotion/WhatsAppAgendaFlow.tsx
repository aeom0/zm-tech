import { AgendaScreen, CHAT, PhoneFrame, WhatsAppScreen } from '@geemastudio/mockups'
import { CalendarCheck } from 'lucide-react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

// Composición de la tarjeta WhatsApp de la landing (se reproduce con @remotion/player).
// Mismo guion que la escena WhatsApp → Agenda del reel de geemastudio-promo, en formato horizontal.

export const FLOW = { width: 760, height: 660, fps: 30 } as const

const WA_GREEN = '#25D366'
const TEAL = '#40E0D0'

// Tiempos en segundos desde el inicio
const FIRST_MESSAGE_S = 0.6
const CLIENT_GAP_S = 1.1
const TYPING_S = 1.1
const ENTER_S = 0.35
const AGENDA_DELAY_S = 0.4
const AGENDA_IN_S = 0.6
const APPOINTMENT_DELAY_S = 0.5
const HOLD_S = 3.4
const FADE_OUT_S = 0.4

const ease = Easing.bezier(0.16, 1, 0.3, 1)
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

type Step = { at: number; typingFrom?: number }

/** Cuándo aparece cada mensaje: la clienta escribe y el asistente «escribe…» antes de responder. */
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

/** Frame en que el asistente confirma la cita (fin del último mensaje). */
function confirmedAt(fps: number) {
  return schedule(fps).at(-1)!.at + ENTER_S * fps
}

export function whatsAppAgendaFlowFrames(fps: number) {
  return Math.ceil(
    confirmedAt(fps) + (AGENDA_DELAY_S + AGENDA_IN_S + APPOINTMENT_DELAY_S + HOLD_S) * fps,
  )
}

export const WhatsAppAgendaFlow = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const steps = schedule(fps)

  // Conversación
  const visible = steps.filter((s) => frame >= s.at).length
  const next = steps[visible]
  const typing = next?.typingFrom !== undefined && frame >= next.typingFrom
  const enterFrom = typing ? next.typingFrom! : (steps[visible - 1]?.at ?? 0)
  const enterProgress = interpolate(frame, [enterFrom, enterFrom + ENTER_S * fps], [0, 1], {
    ...clamp,
    easing: ease,
  })

  // La agenda pasa al frente cuando la cita queda confirmada
  const agendaFrom = confirmedAt(fps) + AGENDA_DELAY_S * fps
  const agenda = interpolate(frame, [agendaFrom, agendaFrom + AGENDA_IN_S * fps], [0, 1], {
    ...clamp,
    easing: ease,
  })
  const appointmentFrom = agendaFrom + (AGENDA_IN_S + APPOINTMENT_DELAY_S) * fps
  const appointment = interpolate(frame, [appointmentFrom, appointmentFrom + 0.6 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })

  // Entrada y salida suaves para que el loop no salte
  const fade = interpolate(
    frame,
    [0, 0.3 * fps, durationInFrames - FADE_OUT_S * fps, durationInFrames - 1],
    [0, 1, 1, 0],
    clamp,
  )

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      {/* Halos */}
      <div
        style={{
          position: 'absolute',
          left: -40,
          top: 80,
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${WA_GREEN}33 0%, transparent 68%)`,
          opacity: 1 - agenda * 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -40,
          top: 60,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${TEAL}33 0%, transparent 68%)`,
          opacity: 0.3 + agenda * 0.7,
        }}
      />

      {/* Agenda del salón (detrás, se activa al confirmar) */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          opacity: interpolate(agenda, [0, 1], [0.35, 1]),
          scale: interpolate(agenda, [0, 1], [0.9, 1]),
          translate: interpolate(agenda, [0, 1], ['24px 18px', '0px 0px']),
          rotate: interpolate(agenda, [0, 1], ['4deg', '0deg']),
          zIndex: agenda > 0.5 ? 2 : 1,
        }}
      >
        <PhoneFrame width={280} style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
          <AgendaScreen enteringId="a6" enterProgress={appointment} />
        </PhoneFrame>
      </div>

      {/* WhatsApp de la clienta */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 60,
          opacity: interpolate(agenda, [0, 1], [1, 0.55]),
          scale: interpolate(agenda, [0, 1], [1, 0.94]),
          translate: interpolate(frame, [0, 0.6 * fps], ['0px 40px', '0px 0px'], {
            ...clamp,
            easing: ease,
          }),
          zIndex: agenda > 0.5 ? 1 : 2,
        }}
      >
        <PhoneFrame
          width={300}
          statusBarColor="#E9EDEF"
          screenBackground="#0B141A"
          style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
        >
          <WhatsAppScreen
            visibleMessages={visible}
            typing={typing}
            enterProgress={enterProgress}
            typingPhase={(frame / fps) % 1}
          />
        </PhoneFrame>
      </div>

      {/* Sello: la cita entra sola */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 22,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 3,
          opacity: appointment > 0 ? Math.min(1, appointment * 1.5) : 0,
          translate: `0px ${12 * (1 - Math.min(1, appointment))}px`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 22px',
            borderRadius: 999,
            backgroundColor: WA_GREEN,
            color: '#0B141A',
            fontSize: 20,
            fontWeight: 800,
            boxShadow: `0 16px 40px ${WA_GREEN}55`,
          }}
        >
          <CalendarCheck size={22} strokeWidth={2.5} />
          La cita entró sola a tu agenda
        </div>
      </div>
    </AbsoluteFill>
  )
}
