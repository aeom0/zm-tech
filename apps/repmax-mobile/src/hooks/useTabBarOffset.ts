// ============================================================
// Offset del tab bar para FABs y padding de listas
// ============================================================
import { layout, spacing } from '../utils/theme'

/**
 * Holgura inferior para listas / FABs dentro de tabs.
 * El tab bar ya reserva su altura en el layout de React Navigation;
 * aquí solo dejamos espacio visual para el FAB o la barra de acción.
 */
export function useTabBarOffset() {
  return {
    /** paddingBottom de listas con FAB circular */
    listPaddingWithFab: layout.fabClearance + spacing.md,
    /** paddingBottom de listas con barra full-width (carrito) */
    listPaddingWithActionBar: layout.fabClearance + spacing.xl,
  }
}
