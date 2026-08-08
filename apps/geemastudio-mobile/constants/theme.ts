import { Platform } from "react-native";
import type { TenantConfig } from "@zmtech/tenant-config";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#4A4A4A",
    card: "#FFFFFF",
    background: "#F8F5FA",
    textMuted: "#8A8A8A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8A8A8A",
    tabIconSelected: "#0B7B72",
    link: "#0B7B72",
    primary: "#0B7B72",
    primaryLight: "#D0F5F2",
    accent: "#D4AF37",
    accentLight: "#F5E6D3",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F5FA",
    backgroundSecondary: "#F0EBF3",
    backgroundTertiary: "#E8D4ED",
    border: "#E0D6E5",
    /** Superficie sobre fondo default (listas, chips suaves) */
    backgroundSubtle: "rgba(0,0,0,0.04)",
    success: "#4CAF50",
    warning: "#D4AF37",
    error: "#D32F2F",
    info: "#0B7B72",
    white: "#FFFFFF",
    black: "#1A1A1A",
    gold: "#D4AF37",
    violet: "#0B7B72",
    violetDark: "#076B62",
    violetLight: "#26C6DA",
    cardShadow: "rgba(64,224,208,0.08)",
  },
  dark: {
    text: "#F5F5F5",
    textSecondary: "#B0B0B0",
    card: "#2A2530",
    background: "#1E1E1E",
    textMuted: "#707070",
    buttonText: "#FFFFFF",
    tabIconDefault: "#707070",
    tabIconSelected: "#4DD9CA",
    link: "#4DD9CA",
    primary: "#4DD9CA",
    primaryLight: "#0D3B38",
    accent: "#C7A84D",
    accentLight: "#3A3324",
    backgroundRoot: "#121212",
    backgroundDefault: "#1E1E1E",
    backgroundSecondary: "#2A2530",
    backgroundTertiary: "#352840",
    border: "#3D3545",
    backgroundSubtle: "rgba(255,255,255,0.04)",
    success: "#66BB6A",
    warning: "#C7A84D",
    error: "#EF5350",
    info: "#4DD9CA",
    white: "#FFFFFF",
    black: "#121212",
    gold: "#C7A84D",
    violet: "#4DD9CA",
    violetDark: "#00897B",
    violetLight: "#80DEEA",
    cardShadow: "rgba(0,0,0,0.4)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  /** Cards de lista (onboarding, etc.) */
  card: 20,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  sm: {
    shadowColor: "#40E0D0",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#40E0D0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#40E0D0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Devuelve una paleta de colores basada en la config del tenant.
// Los tokens neutros (fondos, textos, bordes) son fijos; solo primary y accent
// se toman de la config para mantener el contraste y la coherencia visual.
export function createTheme(config: TenantConfig, isDark: boolean) {
  const base = Colors[isDark ? "dark" : "light"];
  return {
    ...base,
    primary: isDark
      ? lightenHex(config.theme.primaryColor, 0.3)
      : config.theme.primaryColor,
    accent: config.theme.accentColor,
    violet: isDark
      ? lightenHex(config.theme.primaryColor, 0.3)
      : config.theme.primaryColor,
    link: isDark
      ? lightenHex(config.theme.primaryColor, 0.3)
      : config.theme.primaryColor,
    tabIconSelected: isDark
      ? lightenHex(config.theme.primaryColor, 0.3)
      : config.theme.primaryColor,
    info: isDark
      ? lightenHex(config.theme.primaryColor, 0.3)
      : config.theme.primaryColor,
    gold: config.theme.accentColor,
    warning: config.theme.accentColor,
  };
}

export const Gradients = {
  onboarding: {
    // Dirección: 135° (esquina sup-izq → inf-der)
    // Aplicar en: botones CTA, progress dots activos, checkboxes, bordes activos (Lunaris turquesa)
    start: "#40E0D0",
    mid2: "#00897B",
    mid: "#1E88E5",
    end: "#3949AB",

    colors: ["#40E0D0", "#00897B", "#1E88E5", "#3949AB"] as const,

    locations: [0, 0.35, 0.65, 1] as const,

    shadow: "#40E0D044",

    linearStart: { x: 0, y: 0 },
    linearEnd: { x: 1, y: 1 },
  },
} as const;

/**
 * Tokens para canvas oscuro fijo (#111318), p. ej. onboarding.
 * No dependen de claro/oscuro del sistema: el layout fuerza fondo oscuro.
 */
export const Onboarding = {
  canvasBackground: "#111318",
  lunarisAccent: Gradients.onboarding.start,
  text: Colors.dark.text,
  textMuted: "rgba(255,255,255,0.55)",
  textSubtle: "rgba(255,255,255,0.5)",
  iconInactive: "rgba(255,255,255,0.65)",
  border: "rgba(255,255,255,0.10)",
  /** Superficie de card sin seleccionar (mismo valor que Colors.dark.backgroundSubtle) */
  cardBackground: Colors.dark.backgroundSubtle,
  chipBackground: "rgba(255,255,255,0.06)",
  chipBorder: "rgba(255,255,255,0.12)",
  checkBorder: "rgba(255,255,255,0.25)",
} as const;

// Aclarado muy simple para modo oscuro: aumenta la luminosidad mezclando con blanco.
function lightenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
