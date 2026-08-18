import * as Haptics from 'expo-haptics'

/** Feedback táctil para POS / acciones clave (no-op si falla en web). */
export async function hapticLight(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {
    // Plataforma sin háptica
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    // Plataforma sin háptica
  }
}

export async function hapticError(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  } catch {
    // Plataforma sin háptica
  }
}
