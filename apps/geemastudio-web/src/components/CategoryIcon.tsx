import { getCategoryIconShape, ICON_STROKE_WIDTH } from '@zmtech/icons'
import { createElement } from 'react'

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  const shape = getCategoryIconShape(name)
  if (!shape) return null

  if (shape.f) {
    return (
      <svg viewBox="0 0 256 256" fill="currentColor" className={className} aria-hidden>
        {shape.f.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {shape.s.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  )
}
