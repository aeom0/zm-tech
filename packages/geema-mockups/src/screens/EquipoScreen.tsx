import { Calendar, ChevronRight, UserPlus } from 'lucide-react'
import { AppChrome, Avatar, SectionLabel } from '../AppChrome'
import { EMPLOYEES, TODAY, money } from '../data'
import { T, alpha } from '../tokens'

/** Réplica de Equipo (Más → Equipo): KPIs del día y tarjeta por profesional. */
export function EquipoScreen() {
  const totalAppointments = EMPLOYEES.reduce((s, e) => s + e.appointmentsToday, 0)
  const totalRevenue = EMPLOYEES.reduce((s, e) => s + e.revenueToday, 0)

  return (
    <AppChrome
      title="Equipo"
      activeTab="mas"
      back
      headerRight={<UserPlus size={21} color={T.primary} />}
    >
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Citas hoy', value: String(totalAppointments), color: T.primary },
            { label: 'Agendado hoy', value: money(totalRevenue), color: T.gold },
            { label: 'Por cobrar', value: String(TODAY.pending), color: T.info },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 20,
                backgroundColor: T.backgroundDefault,
                border: `1px solid ${T.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <SectionLabel>{EMPLOYEES.length} profesionales activas</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {EMPLOYEES.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 20,
                backgroundColor: T.backgroundDefault,
                border: `1px solid ${T.border}`,
              }}
            >
              <Avatar name={e.name} color={e.color} size={48} ring />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{e.name}</div>
                <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 1 }}>{e.role}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      color: T.textSecondary,
                    }}
                  >
                    <Calendar size={11} color={T.textMuted} />
                    {e.appointmentsToday} {e.appointmentsToday === 1 ? 'cita' : 'citas'}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: alpha(e.color, 0.15),
                      color: e.color,
                    }}
                  >
                    {e.payMode}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.gold }}>
                  {money(e.revenueToday)}
                </div>
                <div style={{ fontSize: 10, color: T.textMuted }}>hoy</div>
              </div>
              <ChevronRight size={16} color={T.textMuted} />
            </div>
          ))}
        </div>
      </div>
    </AppChrome>
  )
}
