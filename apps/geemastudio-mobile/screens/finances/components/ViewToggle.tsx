import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { FinanceView } from '../types'

interface Props {
  view: FinanceView
  onChangeView: (v: FinanceView) => void
}

export function ViewToggle({ view, onChangeView }: Props) {
  const { theme } = useTheme()
  return (
    <View style={styles.row}>
      {(
        [
          { value: 'detalle' as const, label: 'Detalle' },
          { value: 'resumen' as const, label: 'Resumen' },
        ] as const
      ).map((opt) => (
        <Pressable
          key={opt.value}
          style={[
            styles.button,
            {
              backgroundColor:
                view === opt.value ? theme.primary : theme.backgroundSecondary,
            },
          ]}
          onPress={() => {
            onChangeView(opt.value)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
        >
          <ThemedText
            style={[
              styles.text,
              { color: view === opt.value ? theme.buttonText : theme.text },
            ]}
          >
            {opt.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  text: { fontSize: 14, fontWeight: '600' },
})
