import { useId } from 'react'
import { Download, TrendingUp } from 'lucide-react'
import { AppChrome, Avatar, Card, SectionLabel } from '../AppChrome'
import { FINANCE, employeeById, money } from '../data'
import { T, alpha } from '../tokens'

const PERIODS = ['Hoy', 'Semana', 'Mes', 'Año']

type Props = {
  /** 0–1: cuánto de la línea del gráfico está dibujada (para animar). */
  chartProgress?: number
}

/** Réplica de Finanzas (screens/FinancesScreen.tsx): período, ingresos, gráfico y profesionales. */
export function FinanzasScreen({ chartProgress = 1 }: Props) {
  const W = 311
  const H = 120
  const max = Math.max(...FINANCE.daily)
  const pts = FINANCE.daily.map((v, i) => ({
    x: (i / (FINANCE.daily.length - 1)) * W,
    y: H - (v / max) * (H - 10) - 2,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const uid = useId().replace(/:/g, '')
  const areaId = `gm-fin-area-${uid}`
  const clipId = `gm-fin-clip-${uid}`
  const maxEmployee = Math.max(...FINANCE.byEmployee.map((e) => e.total))

  return (
    <AppChrome
      title="Finanzas"
      activeTab="mas"
      back
      headerRight={<Download size={20} color={T.text} />}
    >
      <div style={{ padding: '12px 16px 0' }}>
        {/* Selector de período */}
        <div
          style={{
            display: 'flex',
            padding: 3,
            borderRadius: 999,
            backgroundColor: T.backgroundDefault,
            border: `1px solid ${T.border}`,
            marginBottom: 14,
          }}
        >
          {PERIODS.map((p) => {
            const active = p === 'Mes'
            return (
              <div
                key={p}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '8px 0',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: active ? T.primary : 'transparent',
                  color: active ? '#0B2E2A' : T.textSecondary,
                }}
              >
                {p}
              </div>
            )
          })}
        </div>

        <Card padding={16}>
          <div style={{ fontSize: 13, color: T.textSecondary }}>Ingresos de octubre</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: T.gold, letterSpacing: -0.5 }}>
              {money(FINANCE.monthTotal)}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 8px',
                borderRadius: 999,
                backgroundColor: alpha(T.success, 0.15),
                color: T.success,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <TrendingUp size={12} strokeWidth={2.5} />+{FINANCE.trendPct}%
            </span>
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
            {FINANCE.rangeLabel} · {FINANCE.payments} pagos
          </div>

          <svg
            width={W}
            height={H + 18}
            viewBox={`0 0 ${W} ${H + 18}`}
            style={{ display: 'block', marginTop: 14, overflow: 'visible' }}
            aria-hidden
          >
            <defs>
              <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.primary} stopOpacity="0.35" />
                <stop offset="100%" stopColor={T.primary} stopOpacity="0" />
              </linearGradient>
              <clipPath id={clipId}>
                <rect x="0" y="-10" width={W * chartProgress} height={H + 20} />
              </clipPath>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1="0"
                x2={W}
                y1={H * f}
                y2={H * f}
                stroke={alpha('#FFFFFF', 0.06)}
                strokeDasharray="3 4"
              />
            ))}
            <g clipPath={`url(#${clipId})`}>
              <path d={area} fill={`url(#${areaId})`} />
              <path
                d={line}
                fill="none"
                stroke={T.primary}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === pts.length - 1 ? 4.5 : 2.5}
                  fill={i === pts.length - 1 ? T.primary : T.backgroundDefault}
                  stroke={T.primary}
                  strokeWidth="1.5"
                />
              ))}
            </g>
            {FINANCE.dailyLabels.map((l, i) =>
              l ? (
                <text
                  key={i}
                  x={pts[i].x}
                  y={H + 15}
                  fill={T.textMuted}
                  fontSize="10"
                  textAnchor={i === 0 ? 'start' : 'middle'}
                >
                  {l}
                </text>
              ) : null,
            )}
          </svg>
        </Card>

        <div style={{ height: 16 }} />
        <SectionLabel>Por profesional</SectionLabel>
        <Card>
          {FINANCE.byEmployee.map((row, i) => {
            const emp = employeeById(row.id)
            return (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  borderBottom:
                    i === FINANCE.byEmployee.length - 1 ? 'none' : `1px solid ${T.border}`,
                }}
              >
                <Avatar name={emp.name} color={emp.color} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                      {emp.name.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>
                      {money(row.total)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: alpha('#FFFFFF', 0.06),
                      marginTop: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(row.total / maxEmployee) * 100 * chartProgress}%`,
                        height: '100%',
                        borderRadius: 3,
                        backgroundColor: emp.color,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                    {row.services} servicios · {emp.payMode}
                  </div>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    </AppChrome>
  )
}
