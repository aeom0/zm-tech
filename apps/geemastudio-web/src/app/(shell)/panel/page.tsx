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
import { PageHeader } from '@/components/ui/PageHeader'

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
    description: 'Mensajes, asistente y campañas',
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
      <PageHeader title="Inicio" description="Elige el módulo al que deseas acceder." />

      <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <Link
              key={m.href}
              href={m.href}
              className="hover:border-[var(--tenant-primary)]/40 flex h-full min-h-[148px] flex-col items-center justify-start gap-2.5 pt-5 rounded-2xl border border-fg/[0.08] bg-surface p-4 text-center transition-colors hover:bg-fg/[0.04]"
            >
              <span className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 flex h-11 w-11 items-center justify-center rounded-xl border text-tenant-text">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-fg">{m.label}</span>
              <span className="min-h-[2rem] text-xs leading-4 text-fg-subtle">{m.description}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
