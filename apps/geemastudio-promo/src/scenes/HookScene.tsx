import { MessageCircle } from 'lucide-react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, FONT } from '../brand'
import { Backdrop } from '../components/Backdrop'
import { Headline } from '../components/Headline'

// Copy WABA de clientas (emojis permitidos solo en mensajes de WhatsApp)
const NOTIFICATIONS = [
  { name: 'Sofía', text: 'Hola! Tienen espacio hoy? 🙏', at: 0.6 },
  { name: 'Andrea', text: 'Cuánto cuesta el lifting?', at: 1.05 },
  { name: 'Lucía', text: 'Atienden el sábado?', at: 1.5 },
  { name: 'Carla', text: 'Me pasan precios porfa ✨', at: 1.95 },
]

/** Gancho: la dueña está atendiendo y los mensajes se acumulan. */
export const HookScene = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop accent={BRAND.whatsapp} />
      <Headline text="Estás atendiendo… y no paran de escribirte" highlight="no paran" top={260} />

      <div
        style={{
          position: 'absolute',
          top: 760,
          left: 90,
          right: 90,
          display: 'flex',
          flexDirection: 'column',
          gap: 26,
        }}
      >
        {NOTIFICATIONS.map((n) => (
          <div
            key={n.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: '30px 34px',
              borderRadius: 40,
              backgroundColor: 'rgba(40,40,46,0.82)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              opacity: interpolate(frame, [n.at * fps, n.at * fps + 6], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
              translate: interpolate(frame, [n.at * fps, n.at * fps + 0.5 * fps], ['0px -60px', '0px 0px'], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            <div
              style={{
                width: 88,
                height: 88,
                flexShrink: 0,
                borderRadius: 22,
                backgroundColor: BRAND.whatsapp,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageCircle size={52} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: BRAND.text }}>{n.name}</span>
                <span style={{ fontSize: 30, color: BRAND.textSecondary }}>ahora</span>
              </div>
              <div style={{ fontSize: 40, color: '#D6D6D6', marginTop: 4 }}>{n.text}</div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
