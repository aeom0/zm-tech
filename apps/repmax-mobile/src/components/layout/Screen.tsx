// ============================================================
// Contenedor de pantalla: safe area + padding + ancho tablet
// ============================================================
import React from 'react'
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, spacing, layout } from '../../utils/theme'
import { useResponsive } from '../../hooks/useResponsive'

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right'

export interface ScreenProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  /** Bordes con inset de safe area. Default: top + bottom */
  edges?: ScreenEdge[]
  /** Padding horizontal del tema. Default: true */
  padded?: boolean
  /** Limitar ancho en tablet+. Default: true */
  constrainWidth?: boolean
  backgroundColor?: string
}

/**
 * Wrapper de layout para pantallas sin header nativo (auth, onboarding, Inicio).
 * En tabs con bottom bar usa `edges={['top']}` para no duplicar el inset inferior.
 */
export function Screen({
  children,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
  padded = true,
  constrainWidth = true,
  backgroundColor = colors.bg.primary,
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  const { isTabletUp } = useResponsive()

  const padH = padded ? spacing.base : 0

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor,
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
          paddingLeft: (edges.includes('left') ? insets.left : 0) + padH,
          paddingRight: (edges.includes('right') ? insets.right : 0) + padH,
        },
        style,
      ]}
    >
      <View
        style={[styles.inner, constrainWidth && isTabletUp && styles.constrained, contentStyle]}
      >
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  constrained: {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
})
