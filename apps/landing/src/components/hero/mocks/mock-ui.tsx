/**
 * Sistema compartido de los mocks del hero — glass real, luz y sombra unificadas.
 *
 * Reglas del sistema (aplican a las 3 escenas por igual):
 * - Luz siempre desde arriba-izquierda del viewport del mock.
 * - Glass: `GLASS_CARD` + `glassShadow(accent)` — blur real, borde superior iluminado.
 * - Iconos de línea (stroke 2, sin relleno) — nunca puntos de color como ícono.
 */

const NOISE_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"

/** Card de vidrio: blur + borde con highlight superior (reflejo de la luz) */
export const GLASS_CARD =
  'rounded-lg border border-white/10 border-t-white/20 bg-white/4 backdrop-blur-sm'

/** Variante compacta para chips / filas */
export const GLASS_ROW =
  'rounded-md border border-white/8 border-t-white/15 bg-white/3 backdrop-blur-sm'

/**
 * Sombra glass en 3 capas: contacto (define el objeto) + ambiental difusa
 * tintada con el accent (profundidad) + reflejo interno superior (vidrio).
 */
export function glassShadow(accent: string): string {
  return `0 1px 2px rgba(0,0,0,0.4), 0 8px 20px -6px ${accent}24, inset 0 1px 0 rgba(255,255,255,0.06)`
}

/** Fondo del mock: glow arriba-izquierda + radial imperceptible + grano sutil */
export function MockBackdrop({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute top-[-22%] left-[-10%] h-28 w-40 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(130% 100% at 8% 0%, ${accent}14 0%, transparent 52%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-4"
        style={{ backgroundImage: `url("${NOISE_DATA_URI}")` }}
      />
    </div>
  )
}

const ICONS = {
  home: (
    <>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13.5 9 5 9-5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 12h11L21 8H6" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18 14.6c1.9.9 3 2.9 3 5.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.9 5.1a2 2 0 0 0 1.2 1.2L20 11.2l-4.9 1.9a2 2 0 0 0-1.2 1.2L12 19.2l-1.9-4.9a2 2 0 0 0-1.2-1.2L4 11.2l4.9-1.9a2 2 0 0 0 1.2-1.2L12 3Z" />
      <path d="M19 15.5v4M17 17.5h4" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  star: (
    <path
      fill="currentColor"
      stroke="none"
      d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"
    />
  ),
  trending: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
} as const

export type MockIconName = keyof typeof ICONS

/** Ícono de línea estilo Lucide (stroke 2, sin relleno salvo `star`) */
export function MockIcon({ name, className }: { name: MockIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  )
}
