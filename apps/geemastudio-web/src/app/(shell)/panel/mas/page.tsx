import Link from 'next/link'
import Image from 'next/image'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
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

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchTenantBrandForUser } from '@/lib/tenant-brand'
import { MasLogoutButton } from './_components/MasLogoutButton'

const MODULE_SECTIONS = [
  {
    title: 'Operación diaria',
    items: [
      {
        href: '/panel/agenda',
        label: 'Agenda',
        description: 'Citas del día y calendario',
        icon: Calendar,
      },
      {
        href: '/panel/clientes',
        label: 'Clientes',
        description: 'Historial y datos de contacto',
        icon: Users,
      },
      {
        href: '/panel/waba/mensajes',
        label: 'WhatsApp',
        description: 'Bandeja de chats, asistente y respuestas',
        icon: MessageCircle,
      },
    ],
  },
  {
    title: 'Catálogo y Negocio',
    items: [
      {
        href: '/panel/servicios',
        label: 'Catálogo',
        description: 'Servicios, categorías y precios',
        icon: LayoutGrid,
      },
      {
        href: '/finanzas',
        label: 'Finanzas',
        description: 'Balance, recaudación y medios de pago',
        icon: TrendingUp,
      },
      {
        href: '/panel/personal',
        label: 'Personal',
        description: 'Equipo de trabajo y comisiones',
        icon: UserRound,
      },
      {
        href: '/panel/horarios',
        label: 'Horarios',
        description: 'Turnos y disponibilidad del local',
        icon: Clock,
      },
    ],
  },
  {
    title: 'Sistema y Soporte',
    items: [
      {
        href: '/panel/configuracion',
        label: 'Configuración',
        description: 'Identidad del negocio y web pública',
        icon: Settings,
      },
      {
        href: '/panel/ayuda',
        label: 'Centro de Ayuda',
        description: 'Guías de uso y asistencia técnica ZM Tech',
        icon: HelpCircle,
      },
    ],
  },
]

export default async function PanelMasPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const userEmail = data.session?.user.email ?? 'usuario'
  const brand = data.session
    ? await fetchTenantBrandForUser(supabase, data.session.user.id)
    : { primary: null, accent: null, businessName: null, logoUrl: null }

  const initial = brand.businessName?.trim()?.[0]?.toUpperCase() ?? 'G'

  return (
    <div className="space-y-6">
      {/* Header con logos e identidad */}
      <div className="rounded-2xl border border-fg/[0.08] bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.businessName ?? 'Logo del negocio'}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-2xl border border-fg/[0.1] object-cover"
                unoptimized
              />
            ) : (
              <div className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-xl font-bold text-tenant-text">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-fg sm:text-2xl">
                {brand.businessName || 'GeemaStudio'}
              </h1>
              <p className="truncate text-xs text-fg-muted sm:text-sm">
                Panel de control y menú principal
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3">
            <Image
              src="/logo-diamondSparkleNGlow.svg"
              alt="GeemaStudio"
              width={28}
              height={28}
              className="shrink-0"
            />
            <span className="whitespace-nowrap text-base font-semibold text-fg">
              GeemaStudio <span className="font-normal text-fg-subtle">por ZM Tech</span>
            </span>
          </div>
        </div>
      </div>

      {/* Secciones de módulos */}
      <div className="space-y-6">
        {MODULE_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="px-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {section.title}
            </div>

            <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {section.items.map((m) => {
                const Icon = m.icon
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    className="hover:border-[var(--tenant-primary)]/40 flex h-full min-h-[148px] flex-col items-center justify-start gap-2 rounded-2xl border border-fg/[0.08] bg-surface/90 p-3.5 text-center transition-colors hover:bg-fg/[0.04] active:scale-[0.98]"
                  >
                    <span className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 flex h-10 w-10 items-center justify-center rounded-xl border text-tenant-text">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-fg">{m.label}</span>
                    <span className="line-clamp-2 min-h-[2rem] text-xs leading-4 text-fg-subtle">{m.description}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Apariencia */}
      <div className="rounded-2xl border border-fg/[0.08] bg-card p-4 sm:p-5">
        <div className="mb-3">
          <div className="text-sm font-semibold text-fg">Apariencia</div>
          <div className="text-xs text-fg-subtle">
            Elige el tema de la app en este dispositivo. “Sistema” sigue el de tu teléfono o
            computadora.
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Cuenta y sesión */}
      <div className="rounded-2xl border border-fg/[0.08] bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs text-fg-subtle">Sesión iniciada como</div>
            <div className="truncate text-sm font-medium text-fg-soft">{userEmail}</div>
          </div>
          <MasLogoutButton />
        </div>
      </div>
    </div>
  )
}
