import React from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Onboarding, Spacing } from '@/constants/theme'

interface OnboardingLayoutProps {
  children: React.ReactNode
  scrollable?: boolean
  /** Entry y Complete: reparte espacio vertical (space-between). */
  centered?: boolean
}

/**
 * Contenedor único del onboarding: SafeArea + fondo fijo (no depende del tenant).
 */
export function OnboardingLayout({
  children,
  scrollable = false,
  centered = false,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets()

  const paddingCanvas = {
    backgroundColor: Onboarding.canvasBackground,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
  }

  /** Vista fija: ocupa toda la pantalla. */
  const containerStyle = [paddingCanvas, styles.fill]

  if (scrollable) {
    // El inset superior va en un contenedor FIJO: si insets.top vive solo en contentContainerStyle,
    // al hacer scroll el contenido sube y en Android/iOS puede meterse bajo la barra de estado.
    const scrollInnerPadding = {
      backgroundColor: Onboarding.canvasBackground,
      paddingTop: Spacing.lg,
      paddingBottom: insets.bottom + Spacing.lg,
      paddingHorizontal: Spacing['2xl'],
    }

    return (
      <KeyboardAvoidingView
        style={styles.flexRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.flexRoot,
            {
              paddingTop: insets.top,
              backgroundColor: Onboarding.canvasBackground,
            },
          ]}
        >
          <ScrollView
            style={styles.flexRoot}
            contentContainerStyle={[scrollInnerPadding, styles.scrollContentGrow]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return <View style={[containerStyle, centered && styles.centered]}>{children}</View>
}

const styles = StyleSheet.create({
  flexRoot: {
    flex: 1,
    backgroundColor: Onboarding.canvasBackground,
  },
  fill: {
    flex: 1,
  },
  /** Solo flexGrow en el contenido scrollable: rellena si hay poco contenido, pero deja crecer si hay mucho. */
  scrollContentGrow: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: 'space-between',
  },
})
