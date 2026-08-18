'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  DollarSign,
  Users,
  Home,
  Sparkles,
  MoreHorizontal,
  User,
  Bell,
  TrendingUp,
  Star,
} from 'lucide-react'
import Image from 'next/image'
import { LUNARIS } from '@/lib/theme'

// Tres pantallas de la app que rotan en loop
const SCREENS = [
  {
    id: 'agenda',
    label: 'Agenda del día',
    subtitle: 'Lunes 24 feb · 6 citas',
    accent: LUNARIS.primary,
    items: [
      {
        name: 'María G.',
        service: 'Extensiones vol. ruso',
        time: '10:00',
        color: LUNARIS.primary,
        done: true,
      },
      {
        name: 'Carla M.',
        service: 'Servicio de manos y pies',
        time: '11:30',
        color: '#6A1B9A',
        done: true,
      },
      {
        name: 'Sofía R.',
        service: 'Lifting + tinte',
        time: '13:00',
        color: '#00695C',
        done: false,
      },
      {
        name: 'Andrea P.',
        service: 'Color y tratamiento',
        time: '15:00',
        color: '#FFD700',
        done: false,
      },
    ],
    TabIcon: Calendar,
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    subtitle: 'Febrero 2026',
    accent: '#FFD700',
    items: [
      {
        name: 'Ingresos hoy',
        service: '$ 420',
        time: '↑ 12%',
        color: '#00695C',
        done: true,
      },
      {
        name: 'Esta semana',
        service: '$ 1,840',
        time: '↑ 8%',
        color: '#00695C',
        done: true,
      },
      {
        name: 'Este mes',
        service: '$ 6,240',
        time: '↑ 15%',
        color: '#00695C',
        done: false,
      },
      {
        name: 'Comisiones',
        service: '$ 936',
        time: '↓ 3%',
        color: LUNARIS.primary,
        done: false,
      },
    ],
    TabIcon: DollarSign,
  },
  {
    id: 'personal',
    label: 'Mi equipo',
    subtitle: '4 profesionales activas',
    accent: '#6A1B9A',
    items: [
      {
        name: 'Ana',
        service: '3 citas hoy',
        time: '$ 180',
        color: LUNARIS.primary,
        done: true,
      },
      {
        name: 'Luis',
        service: '2 citas hoy',
        time: '$ 95',
        color: '#6A1B9A',
        done: true,
      },
      {
        name: 'Carla',
        service: '2 citas hoy',
        time: '$ 90',
        color: '#00BCD4',
        done: false,
      },
      {
        name: 'Diego',
        service: '1 cita hoy',
        time: '$ 55',
        color: '#FFD700',
        done: false,
      },
    ],
    TabIcon: Users,
  },
]

const TABS = [
  { Icon: Home, id: 'home' },
  { Icon: Calendar, id: 'agenda' },
  { Icon: Sparkles, id: 'services' },
  { Icon: MoreHorizontal, id: 'more' },
  { Icon: User, id: 'profile' },
]

export function AppMockup() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % SCREENS.length)
        setAnimating(false)
      }, 300)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  const screen = SCREENS[current]

  return (
    <div className="relative mx-auto max-w-[280px]">
      {/* Marco del teléfono */}
      <div className="rounded-[2.8rem] bg-gradient-to-b from-zinc-700 to-zinc-900 p-[3px] shadow-2xl shadow-black/60 ring-1 ring-white/10">
        <div
          className="flex flex-col overflow-hidden rounded-[2.5rem] bg-[#0A0712]"
          style={{ aspectRatio: '9/19' }}
        >
          {/* Status bar */}
          <div className="flex flex-shrink-0 items-center justify-between px-5 pb-1 pt-3">
            <span className="text-[10px] font-medium text-white/50">9:41</span>
            {/* Notch */}
            <div className="h-4 w-16 rounded-full bg-black" />
            <div className="flex items-center gap-1">
              <div className="flex h-3 items-end gap-0.5">
                {[2, 3, 4, 3].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-sm bg-white/40"
                    style={{ height: `${h * 3}px` }}
                  />
                ))}
              </div>
              <div className="relative ml-1 h-2.5 w-4 rounded-sm border border-white/40">
                <div className="absolute right-0 top-1/2 h-1.5 w-0.5 -translate-y-1/2 translate-x-full rounded-r-sm bg-white/40" />
                <div className="h-full w-3/4 rounded-sm bg-white/60" />
              </div>
            </div>
          </div>

          {/* Contenido animado */}
          <div
            className="flex-1 overflow-hidden px-4 pb-2 pt-3"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? 'translateY(8px)' : 'translateY(0)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {/* Header de pantalla */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="mb-0.5 flex items-center gap-1">
                  <Image
                    src="/logo-diamondSparkle.svg"
                    alt=""
                    width={12}
                    height={14}
                    className="h-3 w-auto"
                  />
                  <span className="text-xs font-bold">
                    <span className="text-white">Geema</span>
                    <span
                      style={{
                        background: LUNARIS.gradient.css90,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Studio
                    </span>
                  </span>
                </div>
                <div className="text-sm font-bold text-white">{screen.label}</div>
                <div className="mt-0.5 text-[10px] text-white/50">{screen.subtitle}</div>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: `${screen.accent}30` }}
              >
                <Bell size={14} strokeWidth={2} />
              </div>
            </div>

            {/* Indicadores de pantalla */}
            <div className="mb-4 flex justify-center gap-1">
              {SCREENS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === current ? '20px' : '6px',
                    backgroundColor: i === current ? screen.accent : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>

            {/* Lista de items */}
            <div className="space-y-2">
              {screen.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl p-2.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  {/* Avatar / icono */}
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: `${item.color}40` }}
                  >
                    {item.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold text-white">{item.name}</div>
                    <div className="truncate text-[10px] text-white/50">{item.service}</div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
                    <span className="text-[10px] text-white/60">{item.time}</span>
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: item.done ? '#22c55e' : `${screen.accent}80`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div
            className="flex flex-shrink-0 items-center justify-around border-t px-2 py-3"
            style={{
              backgroundColor: 'rgba(10,7,18,0.95)',
              borderColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {TABS.map(({ Icon, id }, i) => {
              const isActive =
                (i === 1 && screen.id === 'agenda') ||
                (i === 0 && screen.id === 'finanzas') ||
                (i === 3 && screen.id === 'personal')
              return (
                <div key={id} className="flex flex-col items-center gap-0.5">
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    className={`transition-all ${isActive ? 'scale-125' : 'opacity-40'}`}
                    color={isActive ? screen.accent : 'white'}
                  />
                  {isActive && (
                    <div
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: screen.accent }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Glow dinámico */}
      <div
        className="absolute inset-0 -z-10 scale-75 rounded-full blur-3xl transition-all duration-1000"
        style={{ backgroundColor: `${screen.accent}25` }}
      />

      {/* Etiqueta flotante — notificación */}
      <div
        className="absolute -right-4 top-16 whitespace-nowrap rounded-2xl border border-zinc-100 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-xl transition-all duration-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Bell size={11} strokeWidth={2} className="text-zinc-500" />
          {screen.id === 'agenda' && 'Cita en 30 min'}
          {screen.id === 'finanzas' && 'Ingreso registrado'}
          {screen.id === 'personal' && 'Comisión calculada'}
        </span>
      </div>

      {/* Etiqueta flotante — métrica */}
      <div
        className="absolute -left-6 bottom-24 whitespace-nowrap rounded-2xl border border-zinc-100 bg-white px-3 py-2 shadow-xl transition-all duration-500 dark:border-zinc-800 dark:bg-zinc-900"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {screen.id === 'agenda' && 'Ocupación'}
          {screen.id === 'finanzas' && 'Vs. mes anterior'}
          {screen.id === 'personal' && 'Satisfacción'}
        </div>
        <div className="flex items-center gap-1 text-sm font-bold" style={{ color: screen.accent }}>
          {screen.id === 'agenda' && '87% hoy'}
          {screen.id === 'finanzas' && (
            <>
              +15% <TrendingUp size={12} strokeWidth={2.5} />
            </>
          )}
          {screen.id === 'personal' && (
            <>
              4.9 <Star size={11} strokeWidth={2} className="fill-current" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
