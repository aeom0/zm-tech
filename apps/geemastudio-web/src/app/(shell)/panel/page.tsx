'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  ChevronRight,
  Clock,
  HelpCircle,
  ImageIcon,
  LayoutGrid,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  uniqueServiceIds,
  type DashboardAppointment,
  type TopServicesPeriod,
} from '@geemastudio/data'
import { instanteCitaDesdeTexto, zonaIANASegura } from '@zmtech/tenant-config'

import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StateNote } from '@/components/ui/StateNote'
import { useAuth } from '@/contexts/AuthContext'
import { useAgendaServicesMap } from '@/hooks/agenda/useAgendaData'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import {
  useHomeStats,
  useTodayAppointments,
  useTodayRange,
  useTopServices,
} from '@/hooks/dashboard/useHomeDashboard'
import { usePanelAlerts } from '@/hooks/notificaciones/usePanelAlerts'
import { useEmployees } from '@/hooks/personal/useEmployees'
import { formatDashboardCurrency, resolveDashboardCurrencyCode } from '@/lib/dashboardCurrency'

type ModuleItem = {
  href: string
  label: string
  description: string
  icon: LucideIcon
  /** Solo dueño/dev; staff no tiene acceso a ese módulo. */
  adminOnly?: boolean
}

const MODULES: ModuleItem[] = [
  {
    href: '/panel/agenda',
    label: 'Agenda',
    description: 'Citas del día y calendario',
    icon: Calendar,
  },
  {
    href: '/panel/asignar',
    label: 'Asignar citas',
    description: 'Quién atiende cada cita',
    icon: UserCheck,
    adminOnly: true,
  },
  {
    href: '/panel/validacion',
    label: 'Validar pagos',
    description: 'Comprobantes por WhatsApp',
    icon: Receipt,
    adminOnly: true,
  },
  {
    href: '/panel/clientes',
    label: 'Clientes',
    description: 'Historial y segmentos',
    icon: Users,
    adminOnly: true,
  },
  {
    href: '/panel/servicios',
    label: 'Catálogo',
    description: 'Servicios, packs y promos',
    icon: LayoutGrid,
    adminOnly: true,
  },
  {
    href: '/panel/inventario',
    label: 'Inventario',
    description: 'Productos y stock bajo',
    icon: Package,
    adminOnly: true,
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
    adminOnly: true,
  },
  {
    href: '/panel/horarios',
    label: 'Horario',
    description: 'Disponibilidad del negocio',
    icon: Clock,
    adminOnly: true,
  },
  {
    href: '/panel/feriados',
    label: 'Feriados',
    description: 'Días cerrados y especiales',
    icon: CalendarOff,
    adminOnly: true,
  },
  {
    href: '/panel/waba/mensajes',
    label: 'WhatsApp',
    description: 'Mensajes, asistente y campañas',
    icon: MessageCircle,
    adminOnly: true,
  },
  {
    href: '/panel/configuracion',
    label: 'Configuración',
    description: 'Datos del negocio y dominio',
    icon: Settings,
    adminOnly: true,
  },
  {
    href: '/panel/ayuda',
    label: 'Ayuda',
    description: 'Preguntas y soporte técnico',
    icon: HelpCircle,
  },
]

const UPCOMING_LIMIT = 6
const PENDING_STATUSES = new Set(['scheduled', 'confirmed', 'payment_submitted'])

export default function PanelIndexPage() {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: settings, isPending: settingsPending, isError: settingsError } = useTenantSettings()
  const timeZone = settings ? zonaIANASegura(settings.timezone) : null
  const currencyCode = resolveDashboardCurrencyCode(settings?.currency_code)
  const range = useTodayRange(timeZone)
  // Sin zona las cards no existen. Los accesos esperan lo mismo: si salen
  // primero, al llegar los datos se empujan hacia abajo.
  const esperandoZona = settingsPending && !settingsError

  const modules = authLoading ? [] : MODULES.filter((m) => isAdmin || !m.adminOnly)

  const todayLabel = timeZone
    ? new Date().toLocaleDateString('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone,
      })
    : null

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Inicio"
        description={
          todayLabel ? <span className="inline-block first-letter:uppercase">{todayLabel}</span> : 'Resumen del día'
        }
      />

      {range && timeZone ? (
        <>
          {isAdmin && (
            <>
              <StatsRow range={range} currencyCode={currencyCode} />
              <PendingStrip />
            </>
          )}
          <div className="grid min-w-0 gap-4 lg:grid-cols-5">
            <TodayAppointmentsCard
              range={range}
              timeZone={timeZone}
              className={isAdmin ? 'lg:col-span-3' : 'lg:col-span-5'}
            />
            {isAdmin && <TopServicesCard monthStart={range.monthStart} className="lg:col-span-2" />}
          </div>
        </>
      ) : esperandoZona ? (
        <HomeDashboardSkeleton admin={isAdmin} />
      ) : null}

      {!esperandoZona && (
        <section aria-labelledby="home-modules" className="min-w-0 space-y-3">
          <h2 id="home-modules" className="text-sm font-semibold text-fg-muted">
            Módulos
          </h2>
          <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {modules.map((m) => {
              const Icon = m.icon
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="hover:border-[var(--tenant-primary)]/40 flex h-full min-h-[132px] min-w-0 flex-col items-center justify-start gap-2 rounded-2xl border border-fg/[0.08] bg-surface p-4 pt-5 text-center transition-colors hover:bg-fg/[0.04]"
                >
                  <span className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 flex h-10 w-10 items-center justify-center rounded-xl border text-tenant-text">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-fg">{m.label}</span>
                  <span className="text-xs leading-4 text-fg-subtle">{m.description}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function HomeDashboardSkeleton({ admin }: { admin: boolean }) {
  return (
    <div className="space-y-4" aria-hidden>
      {admin && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-fg/[0.06]" />
          ))}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <div
          className={`h-40 animate-pulse rounded-2xl bg-fg/[0.06] ${admin ? 'lg:col-span-3' : 'lg:col-span-5'}`}
        />
        {admin && <div className="h-40 animate-pulse rounded-2xl bg-fg/[0.06] lg:col-span-2" />}
      </div>
    </div>
  )
}

type Range = NonNullable<ReturnType<typeof useTodayRange>>

function StatsRow({ range, currencyCode }: { range: Range; currencyCode: string }) {
  const { data, isLoading, error } = useHomeStats(range, true)
  if (error) return <StateNote kind="error">{(error as Error).message}</StateNote>

  const value = (v: number | undefined, format?: (n: number) => string) =>
    isLoading || v === undefined ? '—' : format ? format(v) : String(v)
  const low = data?.lowStockItems ?? 0

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={Wallet}
        label="Ingresos de hoy"
        value={value(data?.todayRevenue, (n) => formatDashboardCurrency(n, currencyCode))}
        href="/finanzas"
      />
      <StatCard
        icon={CalendarCheck}
        label="Completadas hoy"
        value={value(data?.completedAppointments)}
        href="/panel/agenda"
      />
      <StatCard
        icon={CalendarClock}
        label="Por atender hoy"
        value={value(data?.upcomingAppointments)}
        href="/panel/agenda"
      />
      <StatCard
        icon={Package}
        label="Stock bajo"
        value={value(data?.lowStockItems)}
        href="/panel/inventario"
        tone={low > 0 ? 'warning' : undefined}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  href: string
  tone?: 'warning'
}) {
  const warn = tone === 'warning'
  return (
    <Link
      href={href}
      className={`group flex min-w-0 flex-col gap-2 rounded-2xl border p-4 transition-colors ${
        warn
          ? 'border-amber-500/40 bg-amber-500/[0.08] hover:bg-amber-500/[0.12]'
          : 'hover:border-[var(--tenant-primary)]/40 border-fg/[0.08] bg-surface hover:bg-fg/[0.04]'
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          warn ? 'text-amber-700 dark:text-amber-300' : 'text-fg-muted'
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <span className="truncate text-xl font-bold tabular-nums text-fg sm:text-2xl">{value}</span>
    </Link>
  )
}

/** Pendientes del dueño (mismos datos que la campana); se oculta si no hay nada. */
function PendingStrip() {
  const alerts = usePanelAlerts()
  const firstReference = alerts.unreviewedReferences[0]
  const items = [
    {
      count: alerts.pendingVerifications,
      label: (n: number) => (n === 1 ? 'comprobante por validar' : 'comprobantes por validar'),
      href: '/panel/validacion',
      icon: Receipt,
    },
    {
      count: alerts.unassignedCount,
      label: (n: number) => (n === 1 ? 'cita sin asignar' : 'citas sin asignar'),
      href: '/panel/asignar',
      icon: UserCheck,
    },
    {
      count: alerts.unreviewedReferences.length,
      label: (n: number) => (n === 1 ? 'foto de referencia nueva' : 'fotos de referencia nuevas'),
      // Abre la próxima cita con fotos sin revisar (mismo deep link que la campana).
      href: firstReference
        ? `/panel/agenda?fecha=${firstReference.date.slice(0, 10)}&cita=${firstReference.id}`
        : '/panel/agenda',
      icon: ImageIcon,
    },
  ].filter((i) => i.count > 0)

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Pendientes">
      {items.map((i) => {
        const Icon = i.icon
        return (
          <Link
            key={i.href}
            role="listitem"
            href={i.href}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/[0.08] px-3.5 text-sm text-amber-800 transition-colors hover:bg-amber-500/[0.14] dark:text-amber-200"
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="font-semibold tabular-nums">{i.count}</span>
            {i.label(i.count)}
            <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
          </Link>
        )
      })}
    </div>
  )
}

function TodayAppointmentsCard({
  range,
  timeZone,
  className,
}: {
  range: Range
  timeZone: string
  className?: string
}) {
  const { data, isLoading, error } = useTodayAppointments(range)
  const services = useAgendaServicesMap()
  const employees = useEmployees()
  const empById = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.id, e])),
    [employees.data]
  )

  // Reloj por minuto: la lista se recorta sola a medida que pasan las citas.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { upcoming, remaining } = useMemo(() => {
    // Lo que aún falta atender hoy, incluida la cita en curso (no terminó todavía).
    const pending = (data ?? []).filter((a) => {
      if (!PENDING_STATUSES.has(a.status)) return false
      const start = instanteCitaDesdeTexto(a.date, timeZone).getTime()
      return Number.isNaN(start) || start + (a.duration || 0) * 60_000 > nowMs
    })
    return {
      upcoming: pending.slice(0, UPCOMING_LIMIT),
      remaining: pending.length - UPCOMING_LIMIT,
    }
  }, [data, timeZone, nowMs])

  const day = range.appointmentFrom.slice(0, 10)

  return (
    <section
      aria-labelledby="home-today"
      className={`min-w-0 rounded-2xl border border-fg/[0.08] bg-surface p-4 ${className ?? ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="home-today" className="min-w-0 font-semibold text-fg">
          Próximas citas de hoy
        </h2>
        <Link
          href="/panel/agenda"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-tenant-text hover:underline"
        >
          Ver agenda <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {isLoading ? (
        <StateNote kind="loading">Cargando citas…</StateNote>
      ) : error ? (
        <StateNote kind="error">{(error as Error).message}</StateNote>
      ) : upcoming.length === 0 ? (
        <StateNote kind="empty" icon={<CalendarCheck className="h-5 w-5" />}>
          No quedan citas por atender hoy.
        </StateNote>
      ) : (
        <ul className="divide-y divide-fg/[0.06]">
          {upcoming.map((apt) => (
            <AppointmentItem
              key={apt.id}
              apt={apt}
              day={day}
              timeZone={timeZone}
              serviceNames={services.data}
              employee={empById.get(apt.employee_id)}
            />
          ))}
          {remaining > 0 && (
            <li className="pt-3 text-sm text-fg-muted">
              y {remaining} {remaining === 1 ? 'cita más' : 'citas más'} hoy
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function AppointmentItem({
  apt,
  day,
  timeZone,
  serviceNames,
  employee,
}: {
  apt: DashboardAppointment
  day: string
  timeZone: string
  serviceNames?: Map<string, string>
  employee?: { name: string; color: string }
}) {
  const when = instanteCitaDesdeTexto(apt.date, timeZone)
  const time = Number.isNaN(when.getTime())
    ? apt.date.slice(11, 16)
    : when.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit', timeZone })
  const services =
    uniqueServiceIds(apt.service_id, apt.service_ids, null)
      .map((id) => serviceNames?.get(id))
      .filter(Boolean)
      .join(' + ') || 'Servicio'

  return (
    <li>
      <Link
        href={`/panel/agenda?fecha=${day}&cita=${apt.id}`}
        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-fg/[0.04]"
      >
        <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-fg">{time}</span>
        <span
          aria-hidden
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: employee?.color ?? '#a1a1aa' }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{apt.client_name}</span>
          <span className="block truncate text-xs text-fg-muted">
            {services}
            {employee ? ` · ${employee.name}` : ''}
          </span>
        </span>
        {!employee && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Sin asignar
          </span>
        )}
      </Link>
    </li>
  )
}

function TopServicesCard({ monthStart, className }: { monthStart: string; className?: string }) {
  const [period, setPeriod] = useState<TopServicesPeriod>('month')
  const { data, isLoading, error } = useTopServices(period, monthStart, true)
  const max = data[0]?.count ?? 0

  return (
    <section
      aria-labelledby="home-top"
      className={`min-w-0 rounded-2xl border border-fg/[0.08] bg-surface p-4 ${className ?? ''}`}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="home-top" className="font-semibold text-fg">
          Servicios más pedidos
        </h2>
        <SegmentedControl
          ariaLabel="Periodo de servicios más pedidos"
          className="w-full sm:w-auto"
          options={[
            { value: 'month', label: 'Este mes' },
            { value: 'all', label: 'Siempre' },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {isLoading ? (
        <StateNote kind="loading">Calculando…</StateNote>
      ) : error ? (
        <StateNote kind="error">{error.message}</StateNote>
      ) : data.length === 0 ? (
        <StateNote kind="empty">
          {period === 'month'
            ? 'Aún no hay citas completadas este mes.'
            : 'Aún no hay citas completadas.'}
        </StateNote>
      ) : (
        <ol className="space-y-3">
          {data.map((s, i) => (
            <li key={s.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-fg">
                  <span className="mr-2 font-semibold tabular-nums text-fg-subtle">{i + 1}</span>
                  {s.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-fg">{s.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]" aria-hidden>
                <div
                  className="h-full rounded-full bg-[var(--tenant-primary)]"
                  style={{ width: `${max ? Math.max(6, (s.count / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
