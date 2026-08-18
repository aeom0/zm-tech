import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { useBreakpointValue } from '../hooks/useResponsive'

interface GridProps {
  children: React.ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
    wide?: number
  }
  gap?: number
  style?: ViewStyle
}

export function Grid({ children, columns, gap = 16, style }: GridProps) {
  const cols = useBreakpointValue({
    mobile: columns?.mobile || 1,
    tablet: columns?.tablet || 2,
    desktop: columns?.desktop || 3,
    wide: columns?.wide || 4,
  })

  return (
    <View style={[styles.grid, { gap }, style]}>
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              width: `${100 / cols - (gap * (cols - 1)) / cols}%`,
              marginRight: (index + 1) % cols === 0 ? 0 : gap,
              marginBottom: gap,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  )
}

interface StackProps {
  children: React.ReactNode
  direction?: 'horizontal' | 'vertical'
  spacing?: number
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  wrap?: boolean
  style?: ViewStyle
}

export function Stack({
  children,
  direction = 'vertical',
  spacing = 16,
  align = 'stretch',
  justify = 'flex-start',
  wrap = false,
  style,
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: spacing,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  gridItem: {
    minWidth: 0, // Fix para flex en React Native Web
  },
})
