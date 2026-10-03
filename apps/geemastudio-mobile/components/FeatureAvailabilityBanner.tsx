import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { getFeatureMinPlan, type PlanFeature } from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius } from '@/constants/theme'

const PLAN_LABEL = { basic: 'Basic', pro: 'Pro', elite: 'Elite' } as const

interface FeatureAvailabilityBannerProps {
  feature: PlanFeature
  /** Qué función es, en minúscula: "las finanzas", "el inventario". */
  label: string
  /** true = el plan actual ya la incluye y no se muestra nada. */
  included: boolean
  onPress?: () => void
}

/** Aviso no bloqueante: la función sigue disponible, pero pertenece a un plan superior. */
export function FeatureAvailabilityBanner({
  feature,
  label,
  included,
  onPress,
}: FeatureAvailabilityBannerProps) {
  const { theme } = useTheme()
  if (included) return null

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={[
        styles.container,
        { backgroundColor: `${theme.primary}1F`, borderColor: `${theme.primary}66` },
      ]}
    >
      <Feather name="info" size={18} color={theme.primary} />
      <View style={styles.body}>
        <ThemedText style={styles.text}>
          {label.charAt(0).toUpperCase() + label.slice(1)} se incluye desde el plan{' '}
          {PLAN_LABEL[getFeatureMinPlan(feature)]}. Puedes seguir usándolo con normalidad durante la
          prueba.
        </ThemedText>
        {onPress ? (
          <ThemedText style={[styles.link, { color: theme.primary }]}>Ver mi plan</ThemedText>
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
