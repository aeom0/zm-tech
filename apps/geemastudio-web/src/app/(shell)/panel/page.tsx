import Link from 'next/link'
import {
  Calendar,
  Clock,
  HelpCircle,
  LayoutGrid,
  MessageCircle,
  Settings,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'

const MODULES = [
  {
    href: '/panel/agenda',
    label: 'Agenda',
    description: 'Citas del día y calendario',
    icon: Calendar,
  },
  {
    href: '/panel/clientes',
    label: 'Clientes',
    description: 'Historial y segmentos',
    icon: Users,
  },
  {
    href: '/panel/servicios',
    label: 'Catálogo',
    description: 'Servicios, packs y promos',
    icon: LayoutGrid,
  },
  {
    href: '/finanzas',
    label: 'Finanzas',
    description: 'Operación, resumen y detalle',
    icon: TrendingUp,
  },
  {
    href: '/panel/personal',
    label: 'Personal',
    description: 'Empleados y comisiones',
    icon: UserRound,
  },
  {
    href: '/panel/horarios',
    label: 'Horario',
    description: 'Disponibilidad del negocio',
    icon: Clock,
  },
  {
    href: '/panel/waba/mensajes',
    label: 'WhatsApp',
    description: 'Mensajes, bot y campañas',
    icon: MessageCircle,
  },
  {
    href: '/panel/configuracion',
    label: 'Configuración',
    description: 'Datos del negocio y dominio',
    icon: Settings,
  },
  {
    href: '/panel/ayuda',
    label: 'Ayuda',
    description: 'Preguntas y soporte técnico',
    icon: HelpCircle,
  },
]

export default function PanelIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-fg-subtle">Panel</div>
        <h1 className="text-2xl font-bold text-fg">Inicio</h1>
        <p className="mt-1 text-sm text-fg-muted">Elige el módulo al que deseas acceder.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <Link
              key={m.href}
              href={m.href}
              className="hover:border-[var(--tenant-primary)]/40 flex min-h-[132px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-fg/[0.08] bg-surface p-4 text-center transition-colors hover:bg-fg/[0.04]"
            >
              <span className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 flex h-11 w-11 items-center justify-center rounded-xl border text-tenant-text">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-fg">{m.label}</span>
              <span className="text-xs text-fg-subtle">{m.description}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
