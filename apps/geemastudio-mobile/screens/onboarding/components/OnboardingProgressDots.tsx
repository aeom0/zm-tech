import React from 'react'
import { View, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { Gradients } from '@/constants/theme'

const TOTAL_STEPS = 7

interface OnboardingProgressDotsProps {
  /** 0–6, índice del paso activo (0 = País, ..., 6 = Completado). */
  currentStep: number
}

export function OnboardingProgressDots({ currentStep }: OnboardingProgressDotsProps) {
  const safeStep = Math.min(Math.max(currentStep, 0), TOTAL_STEPS - 1)

  return (
    <View style={styles.container}>
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
        const isActive = index === safeStep
        if (isActive) {
          return (
            <LinearGradient
              key={index}
              colors={[...Gradients.onboarding.colors]}
              locations={[...Gradients.onboarding.locations]}
              start={Gradients.onboarding.linearStart}
              end={Gradients.onboarding.linearEnd}
              style={styles.dotActive}
            />
          )
        }
        return <View key={index} style={styles.dotInactive} />
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dotActive: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
})
