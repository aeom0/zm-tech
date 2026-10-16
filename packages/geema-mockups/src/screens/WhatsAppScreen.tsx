import type { ReactNode } from 'react'
import {
  ArrowLeft,
  Camera,
  CornerUpLeft,
  Lock,
  MapPin,
  Mic,
  MoreVertical,
  Phone,
  Plus,
  Video,
} from 'lucide-react'
import { BusinessLogo } from '../AppChrome'
import { BUSINESS, CHAT, type ChatMessage } from '../data'

// Paleta del modo oscuro de WhatsApp (no es la paleta de Geema).
const WA = {
  bg: '#0B141A',
  header: '#1F2C34',
  incoming: '#1F2C34',
  outgoing: '#005C4B',
  text: '#E9EDEF',
  meta: '#8696A0',
  link: '#53BDEB',
  green: '#25D366',
  verified: '#25D366',
  notice: '#182229',
  noticeText: '#FFD279',
  quoteBar: '#06CF9C',
}

const ENTER_KEYFRAMES = `@keyframes geema-wa-in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
@keyframes geema-wa-dot{0%,60%,100%{opacity:.35;transform:none}30%{opacity:1;transform:translateY(-2px)}}`

type Props = {
  /** Cuántos mensajes mostrar (para animar la conversación). */
  visibleMessages?: number
  /** Muestra el indicador «escribiendo…» del negocio al final. */
  typing?: boolean
  /**
   * Anima con CSS la entrada del último mensaje y los puntos de «escribiendo…».
   * Solo para la web; en Remotion la animación se maneja por frame.
   */
  animate?: boolean
  /**
   * Progreso 0–1 de entrada del último mensaje (o del «escribiendo…»), controlado desde fuera
   * (p. ej. por frame en Remotion). Si se pasa, se desactivan las transiciones CSS.
   */
  enterProgress?: number
  /** Fase 0–1 del rebote de los puntos de «escribiendo…» (por frame). */
  typingPhase?: number
}

/** Conversación de reserva por WhatsApp vista desde el teléfono de la clienta. */
export function WhatsAppScreen({
  visibleMessages = CHAT.length,
  typing = false,
  animate = false,
  enterProgress,
  typingPhase,
}: Props) {
  const enterStyle = (p: number, from: 'client' | 'business') => ({
    opacity: p,
    transform: `translateY(${10 * (1 - p)}px) scale(${0.97 + 0.03 * p})`,
    transformOrigin: from === 'client' ? 'bottom right' : 'bottom left',
  })
  const messages = CHAT.slice(0, visibleMessages)

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: WA.bg, color: WA.text }}>
      {animate ? <style>{ENTER_KEYFRAMES}</style> : null}
      <Wallpaper />

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 108,
          boxSizing: 'border-box',
          backgroundColor: WA.header,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '52px 14px 0 10px',
          zIndex: 5,
        }}
      >
        <ArrowLeft size={22} color={WA.text} />
        <BusinessLogo size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{BUSINESS.name}</span>
            <VerifiedBadge />
          </div>
          <div style={{ fontSize: 12, color: typing ? WA.green : WA.meta }}>
            {typing ? 'escribiendo…' : 'en línea'}
          </div>
        </div>
        <Video size={22} color={WA.text} />
        <Phone size={20} color={WA.text} style={{ marginLeft: 14 }} />
        <MoreVertical size={20} color={WA.text} style={{ marginLeft: 10 }} />
      </div>

      {/* Mensajes: anclados abajo, los antiguos «suben» y se recortan como al hacer scroll */}
      <div
        style={{
          position: 'absolute',
          top: 108,
          left: 0,
          right: 0,
          bottom: 92,
          padding: '0 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            alignSelf: 'center',
            maxWidth: '86%',
            margin: '0 0 10px',
            padding: '7px 12px',
            borderRadius: 8,
            backgroundColor: WA.notice,
            fontSize: 12,
            lineHeight: 1.35,
            color: WA.noticeText,
            textAlign: 'center',
          }}
        >
          <Lock size={10} color={WA.noticeText} style={{ display: 'inline-block', marginRight: 4, verticalAlign: -1 }} />
          Los mensajes están cifrados de extremo a extremo. Esta empresa usa un asistente para
          atenderte.
        </div>
        <div
          style={{
            alignSelf: 'center',
            margin: '0 0 8px',
            padding: '5px 12px',
            borderRadius: 8,
            backgroundColor: WA.header,
            fontSize: 12,
            color: WA.meta,
          }}
        >
          HOY
        </div>
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const firstOfGroup = !prev || prev.from !== m.from
          const isLast = i === messages.length - 1 && !typing
          return (
            <div
              key={i}
              style={{
                marginTop: i === 0 ? 0 : firstOfGroup ? 8 : 3,
                display: 'flex',
                flexDirection: 'column',
                animation: animate && isLast ? 'geema-wa-in 320ms ease-out both' : undefined,
                transformOrigin: m.from === 'client' ? 'bottom right' : 'bottom left',
                ...(isLast && enterProgress !== undefined ? enterStyle(enterProgress, m.from) : null),
              }}
            >
              <Bubble message={m} tail={firstOfGroup} />
            </div>
          )
        })}
        {typing ? (
          <div
            style={{
              marginTop: messages[messages.length - 1]?.from === 'business' ? 3 : 8,
              alignSelf: 'flex-start',
              position: 'relative',
              padding: '12px 14px',
              borderRadius: 10,
              borderTopLeftRadius: 0,
              backgroundColor: WA.incoming,
              display: 'flex',
              gap: 4,
              animation: animate ? 'geema-wa-in 240ms ease-out both' : undefined,
              ...(enterProgress !== undefined ? enterStyle(enterProgress, 'business') : null),
            }}
          >
            <Tail side="left" color={WA.incoming} />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: WA.meta,
                  opacity: animate ? undefined : dotOpacity(i, typingPhase),
                  transform:
                    typingPhase === undefined ? undefined : `translateY(${-2 * dotLift(i, typingPhase)}px)`,
                  animation: animate
                    ? `geema-wa-dot 1.1s ease-in-out ${i * 0.15}s infinite`
                    : undefined,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Barra de escritura */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 92,
          padding: '8px 8px 34px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 46,
            borderRadius: 23,
            backgroundColor: WA.header,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 12,
          }}
        >
          <Plus size={22} color={WA.meta} />
          <span style={{ flex: 1, fontSize: 16, color: WA.meta }}>Mensaje</span>
          <Camera size={22} color={WA.meta} />
        </div>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: WA.green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic size={22} color="#0B141A" />
        </div>
      </div>
    </div>
  )
}

/** Intensidad 0–1 del rebote de cada punto según la fase del ciclo. */
function dotLift(i: number, phase: number) {
  const t = (((phase - i * 0.15) % 1) + 1) % 1
  return t < 0.3 ? Math.sin((t / 0.3) * Math.PI) : 0
}

function dotOpacity(i: number, phase: number | undefined) {
  if (phase === undefined) return [0.9, 0.6, 0.35][i]
  return 0.35 + 0.65 * dotLift(i, phase)
}

function Bubble({ message, tail }: { message: ChatMessage; tail: boolean }) {
  const out = message.from === 'client'
  const color = out ? WA.outgoing : WA.incoming
  const hasAttachments = Boolean(message.buttons?.length || message.cta)
  const side = out ? 'right' : 'left'

  return (
    <div
      style={{
        alignSelf: out ? 'flex-end' : 'flex-start',
        width: hasAttachments ? '80%' : undefined,
        maxWidth: '80%',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: '6px 8px 6px 9px',
          borderRadius: 10,
          borderTopRightRadius: out && tail ? 0 : 10,
          borderTopLeftRadius: !out && tail ? 0 : 10,
          borderBottomLeftRadius: hasAttachments ? 4 : 10,
          borderBottomRightRadius: hasAttachments ? 4 : 10,
          backgroundColor: color,
          fontSize: 15,
          lineHeight: 1.35,
          whiteSpace: 'pre-line',
          display: 'flow-root',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
        }}
      >
        {tail ? <Tail side={side} color={color} /> : null}
        {message.quote ? (
          <div
            style={{
              marginBottom: 5,
              padding: '5px 8px',
              borderRadius: 6,
              borderLeft: `4px solid ${WA.quoteBar}`,
              backgroundColor: 'rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: WA.quoteBar }}>
              {message.quote.author}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(233,237,239,0.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {message.quote.text}
            </div>
          </div>
        ) : null}
        <FormattedText text={message.text} />
        <span
          style={{
            float: 'right',
            marginLeft: 10,
            marginTop: 7,
            marginBottom: -3,
            fontSize: 11,
            lineHeight: '15px',
            color: out ? 'rgba(233,237,239,0.6)' : WA.meta,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {message.time}
          {out ? <ReadTicks /> : null}
        </span>
      </div>

      {message.buttons?.map((b, i, all) => (
        <AttachedButton key={b} last={i === all.length - 1 && !message.cta} icon={<CornerUpLeft size={16} color={WA.link} />}>
          {b}
        </AttachedButton>
      ))}
      {message.cta ? (
        <AttachedButton last icon={<MapPin size={16} color={WA.link} />}>
          {message.cta}
        </AttachedButton>
      ) : null}
    </div>
  )
}

function AttachedButton({
  children,
  icon,
  last,
}: {
  children: ReactNode
  icon: ReactNode
  last: boolean
}) {
  return (
    <div
      style={{
        marginTop: 2,
        padding: '10px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: WA.incoming,
        color: WA.link,
        fontSize: 15,
        fontWeight: 500,
        borderRadius: last ? '4px 4px 10px 10px' : 4,
        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
      }}
    >
      {icon}
      {children}
    </div>
  )
}

/** Interpreta *negritas* como en WhatsApp. */
function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <strong key={i} style={{ fontWeight: 700 }}>
            {p.slice(1, -1)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/** Colita de la primera burbuja de cada grupo. */
function Tail({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <svg
      width="8"
      height="13"
      viewBox="0 0 8 13"
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        [side]: -8,
        transform: side === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      <path d="M0 0h8L1.3 9.2C.6 10.2 0 10 0 8.8z" fill={color} />
    </svg>
  )
}

function VerifiedBadge() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z"
        fill={WA.verified}
      />
      <path
        d="M8 12.2l2.7 2.7L16.2 9.4"
        stroke="#0B141A"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Fondo con garabatos sutiles, inspirado en el wallpaper por defecto. */
function Wallpaper() {
  const doodles =
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' fill='none' stroke='white' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M14 20c4-6 10-6 14 0s10 6 14 0'/>" +
    "<circle cx='88' cy='22' r='7'/><path d='M85 22h6M88 19v6'/>" +
    "<path d='M20 70l6-10 6 10z'/>" +
    "<path d='M70 62c0-5 7-5 7 0 0-5 7-5 7 0 0 5-7 9-7 9s-7-4-7-9z'/>" +
    "<rect x='40' y='92' width='14' height='10' rx='3'/><path d='M43 92v-3h8v3'/>" +
    "<path d='M96 96l4 4 8-8'/>" +
    "<path d='M50 40l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z'/>" +
    '</svg>'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(doodles)}")`,
        backgroundSize: '120px 120px',
      }}
    />
  )
}

function ReadTicks() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden>
      <path
        d="M1 5.5l3 3L10 2.5M6 8.5l1 1L13.5 2.5"
        stroke={WA.link}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
