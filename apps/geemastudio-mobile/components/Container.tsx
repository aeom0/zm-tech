import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { useResponsive } from '../hooks/useResponsive'

interface ContainerProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: boolean
  center?: boolean
  style?: ViewStyle
}

const MAX_WIDTHS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  full: '100%',
} as const

export function Container({
  children,
  maxWidth = 'xl',
  padding = true,
  center = true,
  style,
}: ContainerProps) {
  const { isDesktop } = useResponsive()

  const containerStyle: ViewStyle = {
    width: '100%',
    maxWidth: MAX_WIDTHS[maxWidth],
    paddingHorizontal: padding ? (isDesktop ? 32 : 16) : 0,
    marginHorizontal: center ? 'auto' : 0,
  }

  return <View style={[containerStyle, style]}>{children}</View>
}

export const styles = StyleSheet.create({
  // Estilos adicionales si se necesitan
})
