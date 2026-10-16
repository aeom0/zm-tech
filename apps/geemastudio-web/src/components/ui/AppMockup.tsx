'use client'

import { useState, useEffect, type ComponentType } from 'react'
import { Bell, CheckCircle, TrendingUp } from 'lucide-react'
import {
  AgendaScreen,
  FinanzasScreen,
  InicioScreen,
  PhoneFrame,
  WhatsAppScreen,
  FINANCE,
  TODAY,
  money,
} from '@geemastudio/mockups'
import { LUNARIS } from '@/lib/theme'

// Pantallas de la app que rotan en loop, con el mismo negocio ficticio
const SCREENS: {
  id: string
  Screen: ComponentType
  accent: string
  notice: string
  metricLabel: string
  metric: string
}[] = [
  {
    id: 'inicio',
    Screen: InicioScreen,
    accent: LUNARIS.primary,
    notice: 'Cita en 30 min',
    metricLabel: 'Ingresos hoy',
    metric: money(TODAY.revenue),
  },
  {
    id: 'agenda',
    Screen: AgendaScreen,
    accent: '#F48FB1',
    notice: 'Nueva cita por WhatsApp',
    metricLabel: 'Ocupación',
    metric: '87% hoy',
  },
  {
    id: 'finanzas',
    Screen: FinanzasScreen,
    accent: '#C7A84D',
    notice: 'Comisiones calculadas',
    metricLabel: 'Vs. mes anterior',
    metric: `+${FINANCE.trendPct}%`,
  },
  {
    id: 'whatsapp',
    Screen: WhatsAppScreen,
    accent: '#25D366',
    notice: 'Cita confirmada',
    metricLabel: 'Respuesta',
    metric: '24/7',
  },
]

const INTERVAL_MS = 3800
const FADE_MS = 350

export function AppMockup() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const interval = setInterval(() => {
      setAnimating(true)
      timeout = setTimeout(() => {
        setCurrent((prev) => (prev + 1) % SCREENS.length)
        setAnimating(false)
      }, FADE_MS)
    }, INTERVAL_MS)
    return () => {
      clearInterval(interval)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  const screen = SCREENS[current]
  const Screen = screen.Screen

  return (
    <div className="relative mx-auto w-[290px]">
      <PhoneFrame width={290}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: animating ? 0 : 1,
            transform: animating ? 'scale(0.985)' : 'scale(1)',
            transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
          }}
        >
          <Screen />
        </div>
      </PhoneFrame>

      {/* Indicadores de pantalla */}
      <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
        {SCREENS.map((s, i) => (
          <div
            key={s.id}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === current ? '22px' : '6px',
              backgroundColor: i === current ? screen.accent : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>

      {/* Glow dinámico */}
      <div
        className="absolute inset-0 -z-10 scale-75 rounded-full blur-3xl transition-all duration-1000"
        style={{ backgroundColor: `${screen.accent}30` }}
      />

      {/* Etiqueta flotante — notificación */}
      <div
        className="absolute -right-6 top-20 whitespace-nowrap rounded-2xl border border-zinc-100 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-xl transition-all duration-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <span className="inline-flex items-center gap-1.5">
          {screen.id === 'whatsapp' ? (
            <CheckCircle size={12} strokeWidth={2} className="text-green-500" />
          ) : (
            <Bell size={12} strokeWidth={2} className="text-zinc-500" />
          )}
          {screen.notice}
        </span>
      </div>

      {/* Etiqueta flotante — métrica */}
      <div
        className="absolute -left-8 bottom-28 whitespace-nowrap rounded-2xl border border-zinc-100 bg-white px-3 py-2 shadow-xl transition-all duration-500 dark:border-zinc-800 dark:bg-zinc-900"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{screen.metricLabel}</div>
        <div className="flex items-center gap-1 text-sm font-bold" style={{ color: screen.accent }}>
          {screen.metric}
          {screen.id === 'finanzas' && <TrendingUp size={12} strokeWidth={2.5} />}
        </div>
      </div>
    </div>
  )
}
