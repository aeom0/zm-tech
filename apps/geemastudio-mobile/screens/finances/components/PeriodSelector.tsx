import React from 'react'
import { View, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'

import { financesStyles as styles } from '../financesStyles'
import type { FinancesPeriod } from '../types'

interface Props {
  period: FinancesPeriod
  onChangePeriod: (p: FinancesPeriod) => void
}

export function PeriodSelector({ period, onChangePeriod }: Props) {
  const { theme } = useTheme()
  return (
    <View style={styles.periodSelector}>
      {(
        [
          { value: 'today' as const, label: 'Hoy' },
          { value: 'week' as const, label: 'Semana' },
          { value: 'month' as const, label: 'Mes' },
        ] as const
      ).map((opt) => (
        <Pressable
          key={opt.value}
          style={[
            styles.periodButton,
            {
              backgroundColor:
                period === opt.value ? theme.primary : theme.backgroundSecondary,
            },
          ]}
          onPress={() => {
            onChangePeriod(opt.value)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
        >
          <ThemedText
            style={[
              styles.periodText,
              { color: period === opt.value ? theme.buttonText : theme.text },
            ]}
          >
            {opt.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  )
}
