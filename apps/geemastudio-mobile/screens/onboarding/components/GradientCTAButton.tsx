import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { BorderRadius, Gradients, Spacing } from '@/constants/theme'

type FeatherName = React.ComponentProps<typeof Feather>['name']

interface GradientCTAButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  icon?: FeatherName
  variant?: 'primary' | 'outline'
  style?: ViewStyle
  /** Padding vertical un poco menor (p. ej. onboarding en pantallas bajas). */
  compact?: boolean
}

export function GradientCTAButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'primary',
  style,
  compact = false,
}: GradientCTAButtonProps) {
  const isDisabled = disabled || loading
  const padVPrimary = compact ? 13 : 16
  const padVOutline = compact ? 11 : 14

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [{ opacity: pressed || isDisabled ? 0.7 : 1 }, style]}
      >
        <LinearGradient
          colors={[...Gradients.onboarding.colors]}
          locations={[...Gradients.onboarding.locations]}
          start={Gradients.onboarding.linearStart}
          end={Gradients.onboarding.linearEnd}
          style={styles.outlineGradientBorder}
        >
          <View style={[styles.outlineInner, { paddingVertical: padVOutline }]}>
            <Text style={styles.outlineLabel}>{label}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrapper,
        { opacity: pressed || isDisabled ? 0.85 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={[...Gradients.onboarding.colors]}
        locations={[...Gradients.onboarding.locations]}
        start={Gradients.onboarding.linearStart}
        end={Gradients.onboarding.linearEnd}
        style={[styles.gradient, { paddingVertical: padVPrimary }]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            {icon ? <Feather name={icon} size={18} color="#fff" style={styles.icon} /> : null}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outlineGradientBorder: {
    borderRadius: BorderRadius.lg,
    padding: 1.5,
  },
  outlineInner: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius.lg - 1.5,
    backgroundColor: '#0D0D12',
  },
  outlineLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
  },
})
