/**
 * Conversión hex ↔ RGB ↔ HSV para selector de color (onboarding / ajustes).
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) {
    return null
  }
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (x: number) =>
    Math.round(Math.max(0, Math.min(255, x)))
      .toString(16)
      .padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`.toUpperCase()
}

/** Mezcla `hexA` y `hexB` — `t=0` devuelve `hexA` puro, `t=1` devuelve `hexB` puro. */
export function mixHexColors(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA) ?? { r: 0, g: 0, b: 0 }
  const b = hexToRgb(hexB) ?? { r: 0, g: 0, b: 0 }
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t)
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }
  const lin = (c: number) => {
    const n = c / 255
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Color de texto (`light`/`dark`) con mejor contraste sobre `bgHex`. */
export function getContrastTextColor(
  bgHex: string,
  light: string = '#F5F3F7',
  dark: string = '#1A1620'
): string {
  return relativeLuminance(bgHex) > 0.45 ? dark : light
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    } else if (max === gn) {
      h = ((bn - rn) / d + 2) / 6
    } else {
      h = ((rn - gn) / d + 4) / 6
    }
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h: h * 360, s, v }
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hh = ((((h % 360) + 360) % 360) / 360) * 6
  const i = Math.floor(hh)
  const f = hh - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let rn = 0
  let gn = 0
  let bn = 0
  switch (i % 6) {
    case 0:
      rn = v
      gn = t
      bn = p
      break
    case 1:
      rn = q
      gn = v
      bn = p
      break
    case 2:
      rn = p
      gn = v
      bn = t
      break
    case 3:
      rn = p
      gn = q
      bn = v
      break
    case 4:
      rn = t
      gn = p
      bn = v
      break
    case 5:
      rn = v
      gn = p
      bn = q
      break
    default:
      break
  }
  return { r: rn * 255, g: gn * 255, b: bn * 255 }
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}
