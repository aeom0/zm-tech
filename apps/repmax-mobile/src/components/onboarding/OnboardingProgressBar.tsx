// ============================================================
// RepMAX Business Suite — Barra de progreso segmentada del onboarding
// ============================================================

import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import { colors, borderRadius, spacing } from '../../utils/theme'

interface OnboardingProgressBarProps {
  currentStep: number // índice base-1 (1 = primer paso visible)
  totalSteps: number
}

export default function OnboardingProgressBar({
  currentStep,
  totalSteps,
}: OnboardingProgressBarProps) {
  return (
    <View style={styles.contenedor}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <Segmento
          key={i}
          activo={i < currentStep}
          esSegmentoActual={i === currentStep - 1}
          esPrimero={i === 0}
          esUltimo={i === totalSteps - 1}
        />
      ))}
    </View>
  )
}

// Segmento individual con animación de fill
function Segmento({
  activo,
  esSegmentoActual,
  esPrimero,
  esUltimo,
}: {
  activo: boolean
  esSegmentoActual: boolean
  esPrimero: boolean
  esUltimo: boolean
}) {
  const animWidth = useRef(new Animated.Value(activo ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: activo ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [activo, animWidth])

  return (
    <View
      style={[
        styles.segmentoBase,
        esPrimero && styles.primero,
        esUltimo && styles.ultimo,
        activo && esSegmentoActual && styles.segmentoBaseActual,
      ]}
    >
      <Animated.View
        style={[
          styles.segmentoFill,
          {
            flex: animWidth,
            backgroundColor: colors.brand.orange,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  segmentoBase: {
    flex: 1,
    height: 4,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  segmentoBaseActual: {
    shadowColor: colors.brand.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  segmentoFill: {
    height: '100%',
  },
  primero: {
    borderTopLeftRadius: borderRadius.full,
    borderBottomLeftRadius: borderRadius.full,
  },
  ultimo: {
    borderTopRightRadius: borderRadius.full,
    borderBottomRightRadius: borderRadius.full,
  },
})
