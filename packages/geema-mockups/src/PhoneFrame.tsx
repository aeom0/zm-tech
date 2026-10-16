import type { CSSProperties, ReactNode } from 'react'
import { FONT_STACK, SCREEN } from './tokens'

type Props = {
  /** Ancho final del teléfono en px (incluye el bisel). */
  width?: number
  /** Color de la barra de estado (texto e íconos). */
  statusBarColor?: string
  /** Fondo detrás del contenido (visible bajo la barra de estado). */
  screenBackground?: string
  /** Tipografía de la app (en Remotion conviene pasar una fuente cargada). */
  fontFamily?: string
  style?: CSSProperties
  children: ReactNode
}

const BEZEL = 10

/**
 * Marco de teléfono que renderiza el contenido a 375×812 lógicos y lo escala
 * al ancho pedido, así los tamaños de fuente son los de la app real.
 */
export function PhoneFrame({
  width = 300,
  statusBarColor = '#F5F5F5',
  screenBackground = '#121212',
  fontFamily = FONT_STACK,
  style,
  children,
}: Props) {
  const innerWidth = width - BEZEL * 2
  const scale = innerWidth / SCREEN.width
  const innerHeight = SCREEN.height * scale
  const outerRadius = width * 0.15
  const innerRadius = outerRadius - BEZEL * 0.8

  return (
    <div
      style={{
        position: 'relative',
        width,
        height: innerHeight + BEZEL * 2,
        padding: BEZEL,
        borderRadius: outerRadius,
        background: 'linear-gradient(160deg, #3a3a40 0%, #141418 45%, #2a2a30 100%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08) inset, 0 30px 60px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.6)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: innerWidth,
          height: innerHeight,
          borderRadius: innerRadius,
          overflow: 'hidden',
          backgroundColor: screenBackground,
          isolation: 'isolate',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: SCREEN.width,
            height: SCREEN.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            fontFamily,
            WebkitFontSmoothing: 'antialiased',
            textAlign: 'left',
            lineHeight: 1.3,
          }}
        >
          <StatusBar color={statusBarColor} />
          <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function StatusBar({ color }: { color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px 0 34px',
        color,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>9:41</span>
      {/* Dynamic Island */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 11,
          width: 120,
          height: 34,
          marginLeft: -60,
          borderRadius: 20,
          backgroundColor: '#000',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill={color} aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={color} aria-hidden>
          <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .4 10.3 10.3 0 0 0 .8 3.3L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.5c1.4 0 2.7.5 3.6 1.4l1.3-1.3A7 7 0 0 0 8 3.9a7 7 0 0 0-4.9 1.9l1.3 1.3A5.2 5.2 0 0 1 8 5.7Zm0 3.4c-.6 0-1.2.3-1.6.7L8 11.6l1.6-1.8c-.4-.4-1-.7-1.6-.7Z" />
        </svg>
        <div
          style={{
            position: 'relative',
            width: 25,
            height: 12,
            borderRadius: 4,
            border: `1px solid ${color}`,
            opacity: 0.9,
            padding: 1.5,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '80%', height: '100%', borderRadius: 2, backgroundColor: color }} />
          <div
            style={{
              position: 'absolute',
              right: -3,
              top: 3.5,
              width: 1.5,
              height: 4,
              borderRadius: 1,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  )
}
