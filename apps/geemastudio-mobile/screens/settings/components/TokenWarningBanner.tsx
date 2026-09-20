import React from 'react'
import { View, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius, hexWithAlpha } from '@/constants/theme'

function getBannerColors(
  daysLeft: number,
  theme: { error: string; warning: string; accent: string }
) {
  if (daysLeft <= 0) {
    return {
      background: hexWithAlpha(theme.error, 0.12),
      border: theme.error,
      text: theme.error,
    }
  }
  if (daysLeft <= 7) {
    return {
      background: hexWithAlpha(theme.warning, 0.18),
      border: theme.warning,
      text: theme.warning,
    }
  }
  if (daysLeft <= 30) {
    return {
      background: hexWithAlpha(theme.accent, 0.15),
      border: theme.accent,
      text: theme.accent,
    }
  }
  return null
}

export function TokenWarningBanner() {
  const { config } = useTenant()
  const { theme } = useTheme()

  const expiryStr = config.integrations?.waba?.tokenExpiry

  if (!expiryStr || !config.features?.whatsapp) {
    return null
  }

  const diffMs = new Date(expiryStr).getTime() - Date.now()
  const daysLeft = Math.ceil(diffMs / 86_400_000)
  const colors = getBannerColors(daysLeft, theme)

  if (!colors) {
    return null
  }

  const label =
    daysLeft <= 0
      ? 'El token de WhatsApp Business ha vencido. Renueva las credenciales para que los mensajes sigan funcionando.'
      : daysLeft === 1
        ? 'El token de WhatsApp Business vence en 1 día. Renueva las credenciales lo antes posible.'
        : `El token de WhatsApp Business vence en ${daysLeft} días. Planifica la renovación para no perder el canal.`

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.text,
          {
            color: colors.text,
          },
        ]}
      >
        {label}
      </ThemedText>
      <ThemedText
        type="small"
        style={[
          styles.hint,
          {
            color: theme.textMuted,
          },
        ]}
      >
        Solo visible para dueños y administradores del negocio.
      </ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  text: {
    marginBottom: 4,
  },
  hint: {
    fontSize: 11,
  },
})
