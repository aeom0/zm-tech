import React from 'react'
import { View, StyleSheet, Image } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { Button } from '@/components/Button'
import { useTheme } from '@/hooks/useTheme'
import { useHaptics } from '@/hooks/useHaptics'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius } from '@/constants/theme'

interface StepPreviewProps {
  titulo: string
  bodyText: string
  imageUrl: string | null
  selectedCount: number
  onConfirmSend: () => void
}

export function StepPreview({ titulo, bodyText, imageUrl, selectedCount, onConfirmSend }: StepPreviewProps) {
  const { theme } = useTheme()
  const haptics = useHaptics()
  const { config } = useTenant()

  const handleSend = () => {
    haptics.success()
    onConfirmSend()
  }

  const exampleName = 'María'

  return (
    <View style={styles.container}>
      <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
        Vista previa
      </ThemedText>

      <View style={[styles.bubble, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        {imageUrl && <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />}
        <ThemedText style={styles.whatsAppTitle}>Hola {exampleName} 💜</ThemedText>
        <ThemedText style={{ marginBottom: Spacing.sm }}>{bodyText}</ThemedText>
        {config.contact?.whatsapp && (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Agenda tu cita respondiendo este mensaje o al 📱 {config.contact.whatsapp}
          </ThemedText>
        )}
        <ThemedText type="small" style={{ color: theme.textMuted, marginTop: Spacing.xs }}>
          {config.businessName}
        </ThemedText>
      </View>

      <View style={{ marginTop: Spacing.lg }}>
        <ThemedText style={{ marginBottom: Spacing.xs }}>
          Se enviará a <ThemedText style={{ fontWeight: '700' }}>{selectedCount}</ThemedText> clientas
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Plantilla: <ThemedText style={{ fontWeight: '600' }}>promo_zm_v1</ThemedText>
        </ThemedText>
      </View>

      <Button onPress={handleSend} style={{ marginTop: Spacing['2xl'] }}>
        Enviar promo 💜
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  whatsAppTitle: {
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
})
