import React, { useState } from 'react'
import { View, StyleSheet, FlatList, Pressable } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Button } from '@/components/Button'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { PromoBroadcastItem } from '../types'

interface StepResultadoProps {
  totalSent: number
  totalFailed: number
  failedItems: PromoBroadcastItem[]
  onNuevaPromo: () => void
  onVerHistorial: () => void
}

export function StepResultado({
  totalSent,
  totalFailed,
  failedItems,
  onNuevaPromo,
  onVerHistorial,
}: StepResultadoProps) {
  const { theme } = useTheme()
  const [showErrors, setShowErrors] = useState(false)

  const success = totalSent > 0 && totalFailed === 0

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: success ? theme.success + '22' : theme.warning + '22' },
        ]}
      >
        <Feather
          name={success ? 'check-circle' : 'alert-triangle'}
          size={48}
          color={success ? theme.success : theme.warning}
        />
      </View>

      <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
        {success ? '¡Promo enviada con éxito!' : 'Promo finalizada'}
      </ThemedText>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {totalSent} enviadas · {totalFailed} fallidas
      </ThemedText>

      {totalFailed > 0 && (
        <Pressable
          onPress={() => setShowErrors((v) => !v)}
          style={({ pressed }) => [
            styles.errorToggle,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText type="small" style={{ color: theme.error }}>
            Ver detalles de errores ({totalFailed})
          </ThemedText>
          <Feather name={showErrors ? 'chevron-up' : 'chevron-down'} size={18} color={theme.error} />
        </Pressable>
      )}

      {showErrors && failedItems.length > 0 && (
        <FlatList
          data={failedItems}
          keyExtractor={(item) => item.id}
          style={{ marginTop: Spacing.md, alignSelf: 'stretch' }}
          contentContainerStyle={{ paddingBottom: Spacing.md }}
          renderItem={({ item }) => (
            <View style={[styles.errorRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <ThemedText style={{ fontWeight: '600' }}>{item.client_name}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                {item.phone}
              </ThemedText>
              {item.error_msg && (
                <ThemedText type="small" style={{ color: theme.error, marginTop: Spacing.xs }}>
                  {item.error_msg}
                </ThemedText>
              )}
            </View>
          )}
        />
      )}

      <View style={styles.buttonsRow}>
        <Button onPress={onNuevaPromo} style={{ flex: 1, marginRight: Spacing.sm }}>
          Nueva promo
        </Button>
        <Button onPress={onVerHistorial} style={{ flex: 1, marginLeft: Spacing.sm }}>
          Ver historial
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorToggle: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: Spacing['2xl'],
    alignSelf: 'stretch',
  },
})
