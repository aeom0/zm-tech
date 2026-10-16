import { Bell, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AppChrome } from '../AppChrome'
import { APPOINTMENTS, BUSINESS, EMPLOYEES } from '../data'
import { T, alpha } from '../tokens'

const DAYS = [
  { d: 'Lun', n: 13 },
  { d: 'Mar', n: 14 },
  { d: 'Mié', n: 15 },
  { d: 'Jue', n: 16 },
  { d: 'Vie', n: 17 },
  { d: 'Sáb', n: 18 },
  { d: 'Dom', n: 19 },
]
const SELECTED_DAY = 16
const FILTERS = ['Todas', 'Pendientes', 'Completadas', 'Canceladas']

const FIRST_HOUR = 9
const LAST_HOUR = 17
const HOUR_PX = 50
const GUTTER = 50

type Props = {
  /** Cuántas citas mostrar en la grilla, en orden cronológico (para animar). */
  visibleAppointments?: number
  /**
   * Progreso 0–1 de entrada del último elemento visible, controlado desde fuera
   * (p. ej. por frame en Remotion). Si se pasa, se desactivan las transiciones CSS.
   */
  enterProgress?: number
  /** Cita a la que se aplica `enterProgress` (por defecto, la última visible). */
  enteringId?: string
}

/** Réplica de la agenda del dueño: tira de profesionales + grilla del día. */
export function AgendaScreen({
  visibleAppointments = APPOINTMENTS.length,
  enterProgress,
  enteringId,
}: Props) {
  const counts = Object.fromEntries(
    EMPLOYEES.map((e) => [e.id, APPOINTMENTS.filter((a) => a.employeeId === e.id).length]),
  )
  const colWidth = (375 - GUTTER - 12) / EMPLOYEES.length

  return (
    <AppChrome
      title="Agenda"
      activeTab="agenda"
      badges={{ agenda: 1, mas: 2 }}
      headerRight={
        <div style={{ position: 'relative' }}>
          <Bell size={22} color={T.text} />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: T.error,
              border: `2px solid ${T.backgroundRoot}`,
            }}
          />
        </div>
      }
    >
      {/* Semana */}
      <div style={{ padding: '6px 12px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <ChevronLeft size={20} color={T.textSecondary} />
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            {BUSINESS.monthLabel}
          </span>
          <ChevronRight size={20} color={T.textSecondary} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {DAYS.map(({ d, n }) => {
            const sel = n === SELECTED_DAY
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderRadius: 14,
                  backgroundColor: sel ? T.primary : 'transparent',
                }}
              >
                <span style={{ fontSize: 11, color: sel ? '#0B2E2A' : T.textMuted }}>{d}</span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: sel ? '#0B2E2A' : T.text,
                    marginTop: 2,
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    marginTop: 3,
                    backgroundColor: sel ? '#0B2E2A' : n <= 18 ? T.primarySoft : 'transparent',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Filtro de estado */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {FILTERS.map((f, i) => (
            <span
              key={f}
              style={{
                padding: '5px 9px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: i === 0 ? alpha(T.primary, 0.18) : T.backgroundDefault,
                color: i === 0 ? T.primary : T.textSecondary,
                border: `1px solid ${i === 0 ? alpha(T.primary, 0.5) : T.border}`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Tira de profesionales */}
      <div style={{ display: 'flex', padding: `12px 12px 6px ${GUTTER}px` }}>
        {EMPLOYEES.map((e) => (
          <div
            key={e.id}
            style={{
              width: colWidth,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: `2px solid ${e.color}`,
                  backgroundColor: alpha(e.color, 0.2),
                  color: e.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              >
                {e.name.charAt(0)}
              </div>
              <span
                style={{
                  position: 'absolute',
                  right: -4,
                  top: -3,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: e.color,
                  color: '#121212',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {counts[e.id]}
              </span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, marginTop: 4 }}>
              {e.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Grilla del día */}
      <div style={{ position: 'relative', margin: '0 12px 0 0' }}>
        {Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => {
          const h = FIRST_HOUR + i
          const label = h === 12 ? '12 p. m.' : h > 12 ? `${h - 12} p. m.` : `${h} a. m.`
          return (
            <div
              key={h}
              style={{
                position: 'absolute',
                top: i * HOUR_PX,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: GUTTER - 4,
                  fontSize: 9.5,
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  color: T.textMuted,
                  textAlign: 'right',
                  paddingRight: 4,
                  marginTop: -6,
                }}
              >
                {label}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: alpha('#FFFFFF', 0.06) }} />
            </div>
          )
        })}

        {/* Línea de «ahora» */}
        <div
          style={{
            position: 'absolute',
            top: (12.2 - FIRST_HOUR) * HOUR_PX,
            left: GUTTER - 4,
            right: 0,
            height: 2,
            backgroundColor: T.error,
            zIndex: 2,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: -4,
              top: -3,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: T.error,
            }}
          />
        </div>

        {[...APPOINTMENTS]
          .sort((a, b) => a.start - b.start)
          .map((a, i) => {
            const col = EMPLOYEES.findIndex((e) => e.id === a.employeeId)
            const emp = EMPLOYEES[col]
            const visible = i < visibleAppointments
            const done = a.status === 'completed'
            const entering =
              enterProgress !== undefined &&
              (enteringId ? a.id === enteringId : i === visibleAppointments - 1)
            const p = entering ? enterProgress : 1
            return (
              <div
                key={a.id}
                style={{
                  position: 'absolute',
                  top: (a.start - FIRST_HOUR) * HOUR_PX + 1,
                  left: GUTTER + col * colWidth + 2,
                  width: colWidth - 4,
                  height: (a.duration / 60) * HOUR_PX - 3,
                  borderRadius: 10,
                  backgroundColor: alpha(emp.color, done ? 0.16 : 0.3),
                  borderLeft: `3px solid ${emp.color}`,
                  padding: '4px 5px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  opacity: visible ? (done ? 0.75 : 1) * p : 0,
                  transform: visible ? `scale(${0.9 + 0.1 * p})` : 'scale(0.9)',
                  transition:
                    enterProgress === undefined ? 'opacity 250ms ease, transform 250ms ease' : undefined,
                  boxShadow: entering ? `0 0 ${18 * p}px ${alpha(emp.color, 0.55 * p)}` : undefined,
                  zIndex: entering ? 2 : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.client.split(' ')[0]}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.textSecondary,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                  }}
                >
                  {a.service}
                </div>
              </div>
            )
          })}
      </div>

      {/* FAB nueva cita */}
      <div
        style={{
          position: 'absolute',
          right: 18,
          bottom: 18,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: T.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 20px ${alpha(T.primary, 0.4)}`,
          zIndex: 3,
        }}
      >
        <Plus size={26} color="#0B2E2A" strokeWidth={2.5} />
      </div>
    </AppChrome>
  )
}
