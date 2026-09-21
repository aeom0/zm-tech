import React from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing } from '@/constants/theme'

interface StepEnviandoProps {
  total: number
  sent: number
  failed: number
}

export function StepEnviando({ total, sent, failed }: StepEnviandoProps) {
  const { theme } = useTheme()
  const progress = total > 0 ? (sent + failed) / total : 0

  const scale = useSharedValue(1)

  React.useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.1, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true)
  }, [scale])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, { backgroundColor: theme.whatsapp + '22' }, iconStyle]}>
        <Feather name="send" size={40} color={theme.primary} />
      </Animated.View>
      <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
        Enviando promo...
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        Enviando a {total} clientas por WhatsApp
      </ThemedText>

      <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>
      <ThemedText type="small" style={{ marginTop: Spacing.xs }}>
        {sent} enviadas · {failed} fallidas
      </ThemedText>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
})
