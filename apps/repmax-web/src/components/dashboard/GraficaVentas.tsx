// ============================================================
// Gráfica de ventas (Recharts) — solo cliente; no importar en SSR
// ============================================================

'use client'

import { useId } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface PuntoGraficaVentas {
  etiqueta: string
  total: number
}

interface GraficaVentasProps {
  datos: PuntoGraficaVentas[]
}

export default function GraficaVentas({ datos }: GraficaVentasProps) {
  const reactId = useId().replace(/:/g, '')
  const gradientId = `fillVentas-${reactId}`

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            tick={{ fill: '#9E9E9E', fontSize: 12 }}
            axisLine={{ stroke: '#2A2A2A' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#9E9E9E', fontSize: 12 }}
            axisLine={{ stroke: '#2A2A2A' }}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#242424',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              color: '#F5F5F5',
            }}
            formatter={(value: number | string) => [
              typeof value === 'number'
                ? new Intl.NumberFormat('es-VE', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(value)
                : value,
              'Total',
            ]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="none"
            fill={`url(#${gradientId})`}
            fillOpacity={1}
          />
          <Line type="monotone" dataKey="total" stroke="#FF6B00" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
