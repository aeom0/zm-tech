import type { ReactNode } from 'react'
import { Calendar, Home, Menu, Star, Users, type LucideIcon } from 'lucide-react'
import { BUSINESS } from './data'
import { T, alpha } from './tokens'

export type AppTab = 'inicio' | 'agenda' | 'servicios' | 'clientes' | 'mas'

// Mismo orden, nombre e ícono Feather que navigation/MainTabNavigator.tsx
const TABS: { id: AppTab; label: string; Icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', Icon: Home },
  { id: 'agenda', label: 'Agenda', Icon: Calendar },
  { id: 'servicios', label: 'Servicios', Icon: Star },
  { id: 'clientes', label: 'Clientes', Icon: Users },
  { id: 'mas', label: 'Más', Icon: Menu },
]

export const HEADER_HEIGHT = 104
export const TAB_BAR_HEIGHT = 84

type Props = {
  title: string
  activeTab: AppTab
  /** Muestra el botón atrás en vez del logo (pantallas dentro de «Más»). */
  back?: boolean
  headerRight?: ReactNode
  /** Badge numérico sobre un tab (ej. pagos por validar en «Más»). */
  badges?: Partial<Record<AppTab, number>>
  children: ReactNode
}

export function AppChrome({ title, activeTab, back, headerRight, badges, children }: Props) {
  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: T.backgroundRoot }}>
      <div
        style={{
          position: 'absolute',
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          bottom: TAB_BAR_HEIGHT,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Header nativo: logo del negocio a la izquierda, título centrado */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT,
          paddingTop: 50,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: alpha(T.backgroundRoot, 0.92),
          backdropFilter: 'blur(20px)',
          zIndex: 10,
        }}
      >
        <div style={{ width: 72, paddingLeft: 16, boxSizing: 'border-box' }}>
          {back ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke={T.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <BusinessLogo size={36} />
          )}
        </div>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 600,
            color: T.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 72,
            paddingRight: 16,
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {headerRight}
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: TAB_BAR_HEIGHT,
          paddingBottom: 24,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: alpha(T.backgroundRoot, 0.94),
          backdropFilter: 'blur(20px)',
          borderTop: `0.5px solid ${alpha('#FFFFFF', 0.08)}`,
          zIndex: 10,
        }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = id === activeTab
          const color = active ? T.primary : T.textMuted
          const badge = badges?.[id]
          return (
            <div
              key={id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                position: 'relative',
              }}
            >
              <Icon size={22} color={color} strokeWidth={2} />
              <span style={{ fontSize: 11, fontWeight: 500, color }}>{label}</span>
              {badge ? (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    left: '50%',
                    marginLeft: 6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: T.primary,
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxSizing: 'border-box',
                  }}
                >
                  {badge}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BusinessLogo({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'linear-gradient(135deg, #40E0D0 0%, #00897B 50%, #3949AB 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontSize: size * 0.48,
        fontWeight: 700,
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
      }}
    >
      {BUSINESS.initial}
    </div>
  )
}

/** Tarjeta base de la app: backgroundDefault + borde + radio 24. */
export function Card({
  children,
  padding = 0,
  borderColor = T.border,
}: {
  children: ReactNode
  padding?: number
  borderColor?: string
}) {
  return (
    <div
      style={{
        backgroundColor: T.backgroundDefault,
        border: `1px solid ${borderColor}`,
        borderRadius: 24,
        padding,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: T.textMuted,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

export function Avatar({
  name,
  color,
  size = 40,
  ring = false,
}: {
  name: string
  color: string
  size?: number
  ring?: boolean
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        border: ring ? `2px solid ${color}` : 'none',
        backgroundColor: alpha(color, 0.22),
        color,
        fontSize: size * 0.4,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  )
}
