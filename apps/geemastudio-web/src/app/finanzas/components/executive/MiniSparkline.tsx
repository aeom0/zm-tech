'use client'

import { useExecutiveFmt } from './ExecutiveFmtContext'

export function MiniSparkline({
  values,
  tone = 'default',
}: {
  values: number[]
  tone?: 'default' | 'success' | 'danger'
}) {
  const { colors } = useExecutiveFmt()
  const stroke =
    tone === 'success' ? colors.emerald : tone === 'danger' ? colors.rose : colors.primary

  const w = 44
  const h = 20
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const points = values
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ')

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0 motion-reduce:transition-none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
