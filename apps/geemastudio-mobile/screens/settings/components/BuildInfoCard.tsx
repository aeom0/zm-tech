import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'
import { useAppInfo } from '../hooks/useAppInfo'

interface BuildInfoCardProps {
  visible: boolean
}

export function BuildInfoCard({ visible }: BuildInfoCardProps) {
  const { theme } = useTheme()
  const info = useAppInfo()

  if (!visible) return null

  const handleCopy = async () => {
    const payload = [
      `Versión app: ${info.appVersion}`,
      `Runtime: ${info.runtimeVersion}`,
      `Canal: ${info.channel}`,
      `OTA: ${info.otaId ?? '—'}`,
    ].join('\n')
    await Clipboard.setStringAsync(payload)
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      <ThemedText style={[styles.title, { color: theme.text }]}>Build y actualizaciones</ThemedText>
      <ThemedText type="small" style={[styles.line, { color: theme.textSecondary }]}>
        Versión app: {info.appVersion}
      </ThemedText>
      <ThemedText type="small" style={[styles.line, { color: theme.textSecondary }]}>
        Runtime: {info.runtimeVersion}
      </ThemedText>
      <ThemedText type="small" style={[styles.line, { color: theme.textSecondary }]}>
        Canal: {info.channel}
      </ThemedText>
      <ThemedText type="small" style={[styles.line, { color: theme.textSecondary }]}>
        OTA: {info.otaShort ?? '—'}
      </ThemedText>
      <Pressable
        onPress={handleCopy}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: theme.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <ThemedText style={[styles.buttonLabel, { color: theme.textSecondary }]}>
          Copiar detalle técnico
        </ThemedText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  line: {
    marginBottom: 2,
  },
  button: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
})
