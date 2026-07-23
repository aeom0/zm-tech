// apps/web/src/lib/theme.ts
// Fuente de verdad única de la paleta Lunaris para el sitio web.
// Cualquier color de brand debe importarse desde aquí — nunca hardcodear.

export const LUNARIS = {
  // Gradiente principal (135°) — 4 stops
  gradient: {
    css: "linear-gradient(135deg, #40E0D0 0%, #00897B 35%, #1E88E5 65%, #3949AB 100%)",
    css90:
      "linear-gradient(90deg, #40E0D0 0%, #00897B 35%, #1E88E5 65%, #3949AB 100%)",
    stops: ["#40E0D0", "#00897B", "#1E88E5", "#3949AB"] as const,
    // Para box-shadow / glow con alpha
    glow: "rgba(64,224,208,0.30)",
    glowStrong: "rgba(64,224,208,0.45)",
  },

  // Color primario solo (primer stop del gradiente)
  primary: "#40E0D0",
  primaryDark: "#00897B",
  primaryMid: "#1E88E5",
  indigo: "#3949AB",

  // Badge "Beta" y elementos de acento suave
  badge: {
    bg: "rgba(64,224,208,0.10)",
    border: "rgba(64,224,208,0.30)",
    text: "#40E0D0",
  },

  // Fondo oscuro Lunaris
  dark: "#111318",
} as const;
