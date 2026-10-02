import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import type { UsageStatus } from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

interface PlanLimitBannerProps {
  status: UsageStatus
  /** Qué se limita, en plural y minúscula: "profesionales". */
  resource: string
  usage: number
  limit: number | null
  planName: string
  onPress?: () => void
}

/** Aviso no bloqueante al acercarse (80%) o superar el límite del plan. */
export function PlanLimitBanner({
  status,
  resource,
  usage,
  limit,
  planName,
  onPress,
}: PlanLimitBannerProps) {
  const { theme } = useTheme()
  if (status === 'ok' || limit === null) return null

  const over = status === 'over'
  const tone = over ? theme.warning : theme.primary

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={[styles.container, { backgroundColor: `${tone}1F`, borderColor: `${tone}66` }]}
    >
      <Feather name={over ? 'alert-triangle' : 'info'} size={18} color={tone} />
      <View style={styles.body}>
        <ThemedText style={styles.text}>
          {over
            ? `Superaste el límite de ${resource} del plan ${planName} (${usage} de ${limit}).`
            : `Estás usando ${usage} de ${limit} ${resource} del plan ${planName}.`}{' '}
          Puedes seguir trabajando con normalidad.
        </ThemedText>
        {onPress ? (
          <ThemedText style={[styles.link, { color: tone }]}>Ver mi plan</ThemedText>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  body: { flex: 1, gap: Spacing.xs },
  text: { fontSize: 13, lineHeight: 18 },
  link: { fontSize: 13, fontWeight: '600' },
})
