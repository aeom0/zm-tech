import type { ReactNode } from 'react'
import { AlertTriangle, Minus, Plus, Search } from 'lucide-react'
import { AppChrome } from '../AppChrome'
import { INVENTORY, INVENTORY_TABS } from '../data'
import { T, alpha } from '../tokens'

type Props = {
  /** Sobrescribe la cantidad de un ítem por índice (para animar un +/−). */
  quantities?: Partial<Record<number, number>>
}

/** Réplica de Inventario: categorías, alerta de stock bajo y tarjetas con +/−. */
export function InventarioScreen({ quantities }: Props) {
  const items = INVENTORY.map((it, i) => ({ ...it, quantity: quantities?.[i] ?? it.quantity }))
  const low = items.filter((it) => it.quantity <= it.min).length

  return (
    <AppChrome
      title="Inventario"
      activeTab="mas"
      back
      headerRight={<Search size={20} color={T.text} />}
    >
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {INVENTORY_TABS.map((t, i) => (
            <span
              key={t}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: i === 0 ? T.primary : T.backgroundDefault,
                color: i === 0 ? '#0B2E2A' : T.textSecondary,
                border: `1px solid ${i === 0 ? T.primary : T.border}`,
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {low > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 14,
              backgroundColor: '#3A3324',
              border: `1px solid ${alpha(T.warning, 0.4)}`,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={16} color={T.warning} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.warning }}>
              {low} {low === 1 ? 'producto' : 'productos'} bajo el mínimo
            </span>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => {
            const isLow = it.quantity <= it.min
            return (
              <div
                key={it.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 18,
                  backgroundColor: T.backgroundDefault,
                  border: `1px solid ${isLow ? T.warning : T.border}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: T.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {it.name}
                    </span>
                    {isLow ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: 3,
                          borderRadius: 6,
                          backgroundColor: alpha(T.warning, 0.15),
                        }}
                      >
                        <AlertTriangle size={11} color={T.warning} />
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                    {it.unit} · mín. {it.min}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <QtyButton>
                    <Minus size={16} color={T.text} />
                  </QtyButton>
                  <span
                    style={{
                      width: 28,
                      textAlign: 'center',
                      fontSize: 17,
                      fontWeight: 700,
                      color: isLow ? T.warning : T.text,
                    }}
                  >
                    {it.quantity}
                  </span>
                  <QtyButton>
                    <Plus size={16} color={T.text} />
                  </QtyButton>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
        }}
      >
        <Plus size={26} color="#0B2E2A" strokeWidth={2.5} />
      </div>
    </AppChrome>
  )
}

function QtyButton({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        border: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </span>
  )
}
