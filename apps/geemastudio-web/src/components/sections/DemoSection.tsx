'use client'

import { useState, type ComponentType } from 'react'
import { Calendar, DollarSign, Users, Package, MessageCircle, type LucideIcon } from 'lucide-react'
import {
  AgendaScreen,
  EquipoScreen,
  FinanzasScreen,
  InventarioScreen,
  PhoneFrame,
} from '@geemastudio/mockups'
import { LiveWhatsApp } from '@/components/ui/LiveWhatsApp'
import { RevealWrapper } from '@/components/ui/RevealWrapper'
import { LUNARIS } from '@/lib/theme'

const DEMO_TABS: {
  id: string
  label: string
  icon: LucideIcon
  title: string
  description: string
  accent: string
  stats: { value: string; label: string }[]
}[] = [
  {
    id: 'agenda',
    label: 'Agenda',
    icon: Calendar,
    title: 'Citas bajo control',
    description:
      'Vista diaria por profesional. Toca para ver detalles, arrastra para reprogramar. Sin conflictos, sin doble-reservas.',
    accent: LUNARIS.primary,
    stats: [
      { value: '−40%', label: 'Ausencias con recordatorio en el celular' },
      { value: '3x', label: 'Más rápido que un cuaderno' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: DollarSign,
    title: 'Tu caja, clara y al día',
    description:
      'Ingresos por día, semana y mes. Comisiones calculadas automáticamente. Cierra el mes en segundos, sin Excel.',
    accent: '#F59E0B',
    stats: [
      { value: '100%', label: 'Comisiones calculadas solas' },
      { value: '<2 min', label: 'Para cerrar el mes' },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    icon: Users,
    title: 'Tu equipo, coordinado',
    description:
      'Perfiles por profesional con citas del día, ingresos generados y modo de pago. Cada uno ve solo lo suyo.',
    accent: LUNARIS.primaryMid,
    stats: [
      { value: '0', label: 'Conflictos de agenda entre profesionales' },
      { value: '∞', label: 'Profesionales soportados en plan Elite' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    title: 'Nunca más sin insumos',
    description:
      'Alertas automáticas de stock bajo. Registro de uso por servicio. Deja de perder dinero por falta de control.',
    accent: LUNARIS.primaryDark,
    stats: [
      { value: '−30%', label: 'Desperdicio de insumos' },
      { value: 'Automático', label: 'Alerta cuando el stock baja' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    title: 'Agenda por WhatsApp',
    description:
      'El asistente atiende a tus clientes 24/7: responde, muestra el catálogo, toma la cita y envía confirmación con IA.',
    accent: '#25D366',
    stats: [
      { value: '24/7', label: 'Disponible sin intervención humana' },
      { value: '−60%', label: 'Citas perdidas por falta de respuesta' },
    ],
  },
]

// ── Dispatcher ─────────────────────────────────────────────────────────────
const DEMO_SCREENS: Record<string, ComponentType> = {
  agenda: AgendaScreen,
  finanzas: FinanzasScreen,
  equipo: EquipoScreen,
  inventario: InventarioScreen,
  whatsapp: LiveWhatsApp,
}

function DemoMockup({ tab }: { tab: (typeof DEMO_TABS)[0] }) {
  const Screen = DEMO_SCREENS[tab.id]
  if (!Screen) return null
  return (
    <div className="relative mx-auto w-[300px]">
      <div
        className="absolute inset-0 -z-10 scale-90 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: `${tab.accent}22` }}
      />
      <PhoneFrame width={300}>
        <div key={tab.id} className="absolute inset-0 animate-rise">
          <Screen />
        </div>
      </PhoneFrame>
    </div>
  )
}

export function DemoSection() {
  const [activeTab, setActiveTab] = useState(DEMO_TABS[0].id)
  const currentTab = DEMO_TABS.find((t) => t.id === activeTab)!

  return (
    <section id="demo" className="overflow-hidden bg-zinc-950 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="mb-14 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              Demo interactivo
            </span>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
              Míralo antes de comprarlo
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Toca cada módulo y ve cómo funciona GeemaStudio en un celular real.
            </p>
          </div>
        </RevealWrapper>

        {/* Tabs */}
        <RevealWrapper variant="up" delay={100}>
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            {DEMO_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-white shadow-lg'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                style={activeTab === tab.id ? { background: LUNARIS.gradient.css } : {}}
              >
                <tab.icon size={15} strokeWidth={2} />
                {tab.label}
              </button>
            ))}
          </div>
        </RevealWrapper>

        {/* Contenido: mockup + info */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <RevealWrapper variant="up" delay={150}>
            <DemoMockup tab={currentTab} />
          </RevealWrapper>

          <RevealWrapper variant="up" delay={200}>
            <div className="space-y-8">
              <div>
                <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                  {currentTab.title}
                </h3>
                <p className="text-lg leading-relaxed text-zinc-400">{currentTab.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {currentTab.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <p className="mb-1 text-3xl font-bold" style={{ color: currentTab.accent }}>
                      {stat.value}
                    </p>
                    <p className="text-sm text-zinc-400">{stat.label}</p>
                  </div>
                ))}
              </div>
              <a
                href="#precios"
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: currentTab.accent }}
              >
                Empezar con {currentTab.label} gratis →
              </a>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}
