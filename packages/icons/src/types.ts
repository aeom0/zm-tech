export type IconElementTag = 'path' | 'circle' | 'rect' | 'line' | 'polyline' | 'ellipse'

export type IconElement = readonly [IconElementTag, Record<string, string | number>]

/**
 * Forma de un ícono. `s`: elementos de trazo en viewBox 24 (se dibujan con
 * fill none y trazo redondeado de {@link ICON_STROKE_WIDTH}). `f`: paths rellenos
 * en viewBox 256 (Phosphor Regular, que ya trae el trazo convertido a relleno).
 */
export type IconShape = { s: readonly IconElement[]; f?: undefined } | { f: readonly string[]; s?: undefined }
