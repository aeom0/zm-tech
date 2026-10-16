import { AlertTriangle, CheckCircle, ChevronRight, Clock, DollarSign } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppChrome, Card, SectionLabel } from '../AppChrome'
import { APPOINTMENTS, BUSINESS, TODAY, employeeById, money } from '../data'
import { T, alpha } from '../tokens'

type Props = {
  /** Cuántas filas de «Próximas citas» mostrar (para animar). */
  visibleRows?: number
  /**
   * Progreso 0–1 de entrada del último elemento visible, controlado desde fuera
   * (p. ej. por frame en Remotion). Si se pasa, se desactivan las transiciones CSS.
   */
  enterProgress?: number
}

/** Réplica del Dashboard (screens/DashboardScreen.tsx) en modo oscuro. */
export function InicioScreen({ visibleRows = 4, enterProgress }: Props) {
  const upcoming = APPOINTMENTS.filter((a) => a.status === 'scheduled').slice(0, 4)

  return (
    <AppChrome title={BUSINESS.name} activeTab="inicio" badges={{ mas: 2 }}>
      <div style={{ padding: '16px 16px 0' }}>
        {/* Saludo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 3 }}>
            Buenos días, {BUSINESS.owner}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>
            {BUSINESS.dateLong.charAt(0).toUpperCase() + BUSINESS.dateLong.slice(1)}
          </div>
          <div style={{ fontSize: 13, marginTop: 4, fontStyle: 'italic', color: T.textSecondary }}>
            Cada cita es una clienta feliz que vuelve.
          </div>
        </div>

        <SectionLabel>Resumen de hoy</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatCard
            Icon={DollarSign}
            label="Ingresos hoy"
            value={`${BUSINESS.currency}${TODAY.revenue}`}
            color={T.gold}
            subtitle={`${TODAY.payments} pagos`}
          />
          <StatCard
            Icon={CheckCircle}
            label="Completadas"
            value={String(TODAY.completed)}
            color={T.success}
          />
          <StatCard Icon={Clock} label="Pendientes" value={String(TODAY.pending)} color={T.primary} />
        </div>

        <div style={{ height: 16 }} />

        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              padding: '16px 16px 12px',
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                Próximas citas
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>Hoy y mañana</div>
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: T.primary,
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {TODAY.pending}
            </span>
          </div>
          <div
            style={{
              padding: '12px 16px 4px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: T.textMuted,
            }}
          >
            Hoy
          </div>
          {upcoming.map((a, i) => {
            const emp = employeeById(a.employeeId)
            const isNext = i === 0
            const visible = i < visibleRows
            const p = enterProgress !== undefined && i === visibleRows - 1 ? enterProgress : 1
            return (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: i === upcoming.length - 1 ? 'none' : `1px solid ${T.border}`,
                  backgroundColor: isNext ? alpha(emp.color, 0.1) : 'transparent',
                  opacity: visible ? p : 0,
                  transform: visible ? `translateY(${8 * (1 - p)}px)` : 'translateY(8px)',
                  transition:
                    enterProgress === undefined ? 'opacity 300ms ease, transform 300ms ease' : undefined,
                }}
              >
                <div
                  style={{
                    width: 80,
                    marginRight: 4,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                    color: T.primarySoft,
                  }}
                >
                  {a.time}
                </div>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginRight: 8,
                    background: `linear-gradient(135deg, ${emp.color}, ${alpha(emp.color, 0.6)})`,
                    boxShadow: `0 1px 3px ${alpha(emp.color, 0.5)}`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: T.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {a.client}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 1,
                      color: T.textSecondary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {a.service}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>
                    {money(a.price)}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 1, color: T.textMuted }}>
                    {a.duration}m
                  </div>
                </div>
                <ChevronRight size={14} color={T.textMuted} style={{ marginLeft: 4 }} />
              </div>
            )
          })}
        </Card>

        <div style={{ height: 16 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 18,
            backgroundColor: '#3A3324',
            border: `1px solid ${alpha(T.gold, 0.35)}`,
          }}
        >
          <AlertTriangle size={18} color={T.gold} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.gold }}>
              {TODAY.lowStock} productos con stock bajo
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary }}>Revisa tu inventario</div>
          </div>
          <ChevronRight size={16} color={T.gold} />
        </div>
      </div>
    </AppChrome>
  )
}

function StatCard({
  Icon,
  label,
  value,
  color,
  subtitle,
}: {
  Icon: LucideIcon
  label: string
  value: string
  color: string
  subtitle?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 24,
        border: `1px solid ${T.border}`,
        backgroundColor: T.backgroundDefault,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: alpha(color, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: T.textSecondary, textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ fontSize: 10, marginTop: 2, color: T.textMuted, minHeight: 13 }}>
        {subtitle ?? ''}
      </div>
    </div>
  )
}
