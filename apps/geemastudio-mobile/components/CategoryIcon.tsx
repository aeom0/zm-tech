import {
  getCategoryIconShape,
  getDefaultCategoryIcon,
  ICON_STROKE_WIDTH,
  type IconElementTag,
} from '@zmtech/icons'
import Svg, { Circle, Ellipse, Line, Path, Polyline, Rect } from 'react-native-svg'

const ELEMENTS: Record<IconElementTag, React.ComponentType<any>> = {
  path: Path,
  circle: Circle,
  rect: Rect,
  line: Line,
  polyline: Polyline,
  ellipse: Ellipse,
}

/**
 * Ícono de categoría compartido con web (`@zmtech/icons`). Si `name` es nulo o
 * desconocido cae al ícono por defecto del rubro.
 */
export function CategoryIcon({
  name,
  businessType,
  size = 18,
  color,
}: {
  name?: string | null
  businessType?: string | null
  size?: number
  color: string
}) {
  const shape =
    getCategoryIconShape(name) ?? getCategoryIconShape(getDefaultCategoryIcon(businessType))
  if (!shape) return null

  if (shape.f) {
    return (
      <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
        {shape.f.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </Svg>
    )
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shape.s.map(([tag, attrs], i) => {
        const El = ELEMENTS[tag]
        return <El key={i} {...attrs} />
      })}
    </Svg>
  )
}
