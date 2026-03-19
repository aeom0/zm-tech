import { Platform } from "react-native";
import type { TenantConfig } from "@salonpro/tenant-config";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#4A4A4A",
    card: "#FFFFFF",
    background: "#F8F5FA",
    textMuted: "#8A8A8A",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8A8A8A",
    tabIconSelected: "#7B2D8E",
    link: "#7B2D8E",
    primary: "#7B2D8E",
    primaryLight: "#E8D4ED",
    accent: "#D4AF37",
    accentLight: "#F5E6D3",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F5FA",
    backgroundSecondary: "#F0EBF3",
    backgroundTertiary: "#E8D4ED",
    border: "#E0D6E5",
    success: "#4CAF50",
    warning: "#D4AF37",
    error: "#D32F2F",
    info: "#7B2D8E",
    white: "#FFFFFF",
    black: "#1A1A1A",
    gold: "#D4AF37",
    violet: "#7B2D8E",
    violetDark: "#5A1F6A",
    violetLight: "#9B4DB0",
    cardShadow: "rgba(123,45,142,0.08)",
  },
  dark: {
    text: "#F5F5F5",
    textSecondary: "#B0B0B0",
    card: "#2A2530",
    background: "#1E1E1E",
    textMuted: "#707070",
    buttonText: "#FFFFFF",
    tabIconDefault: "#707070",
    tabIconSelected: "#AD7FBC",
    link: "#AD7FBC",
    primary: "#AD7FBC",
    primaryLight: "#382F40",
    accent: "#C7A84D",
    accentLight: "#3A3324",
    backgroundRoot: "#121212",
    backgroundDefault: "#1E1E1E",
    backgroundSecondary: "#2A2530",
    backgroundTertiary: "#352840",
    border: "#3D3545",
    success: "#66BB6A",
    warning: "#C7A84D",
    error: "#EF5350",
    info: "#AD7FBC",
    white: "#FFFFFF",
    black: "#121212",
    gold: "#C7A84D",
    violet: "#AD7FBC",
    violetDark: "#7B2D8E",
    violetLight: "#D4A0E0",
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
    shadowColor: "#7B2D8E",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#7B2D8E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#7B2D8E",
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
    // Aplicar en: botones CTA, progress dots activos, checkboxes, bordes activos
    start: '#E91E8C',   // Magenta
    mid2:  '#9C27B0',   // Púrpura (posición ~35%)
    mid:   '#3D3D8F',   // Índigo (posición ~65%)
    end:   '#1565C0',   // Azul profundo

    // Array listo para LinearGradient de expo-linear-gradient
    colors: ['#E91E8C', '#9C27B0', '#3D3D8F', '#1565C0'] as const,

    // Posiciones normalizadas
    locations: [0, 0.35, 0.65, 1] as const,

    // Para sombra del botón CTA
    shadow: '#E91E8C44',

    // Coordenadas para LinearGradient (135°)
    linearStart: { x: 0, y: 0 },
    linearEnd:   { x: 1, y: 1 },
  },
} as const;

// Aclarado muy simple para modo oscuro: aumenta la luminosidad mezclando con blanco.
function lightenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
