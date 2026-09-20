import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { Gradients, Spacing, BorderRadius, Typography } from '@/constants/theme'
import { useTheme } from '@/hooks/useTheme'

interface GradientButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  showArrow?: boolean
  /** `brand` = colores del tenant; `onboarding` = Lunaris (shell Geema) */
  variant?: 'brand' | 'onboarding'
  style?: ViewStyle
  textStyle?: TextStyle
}

export function GradientButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  showArrow = true,
  variant = 'brand',
  style,
  textStyle,
}: GradientButtonProps) {
  const { theme, brandGradient } = useTheme()
  const g = variant === 'onboarding' ? Gradients.onboarding : brandGradient

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pressable,
        { shadowColor: g.shadow },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={[...g.colors]}
        locations={[...g.locations]}
        start={g.linearStart}
        end={g.linearEnd}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={theme.buttonText} size="small" />
        ) : (
          <>
            <Text style={[styles.label, { color: theme.buttonText }, textStyle]}>{label}</Text>
            {showArrow && <Feather name="arrow-right" size={20} color={theme.buttonText} />}
          </>
        )}
      </LinearGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    height: 56,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  label: {
    ...Typography.body,
    fontWeight: '700',
  },
})
