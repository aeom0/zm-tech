import React, { useCallback, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface ScrollFadeRowProps {
  children: React.ReactNode
  /** Debe coincidir con el fondo detrás de la fila para que el degradado se funda bien. */
  backgroundColor: string
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  fadeWidth?: number
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled'
}

const SCROLL_EPSILON = 4

/** Fila con scroll horizontal que muestra un fundido en los bordes cuando hay más contenido fuera de vista. */
export function ScrollFadeRow({
  children,
  backgroundColor,
  contentContainerStyle,
  style,
  fadeWidth = 28,
  keyboardShouldPersistTaps,
}: ScrollFadeRowProps) {
  const [layoutWidth, setLayoutWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)
  const [scrollX, setScrollX] = useState(0)

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setLayoutWidth(e.nativeEvent.layout.width)
  }, [])

  const onContentSizeChange = useCallback((w: number) => {
    setContentWidth(w)
  }, [])

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x)
  }, [])

  const isScrollable = contentWidth > layoutWidth + SCROLL_EPSILON
  const showLeftFade = isScrollable && scrollX > SCROLL_EPSILON
  const showRightFade = isScrollable && scrollX < contentWidth - layoutWidth - SCROLL_EPSILON

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </ScrollView>
      {showLeftFade && (
        <LinearGradient
          colors={[backgroundColor, `${backgroundColor}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeLeft, { width: fadeWidth }]}
          pointerEvents="none"
        />
      )}
      {showRightFade && (
        <LinearGradient
          colors={[`${backgroundColor}00`, backgroundColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeRight, { width: fadeWidth }]}
          pointerEvents="none"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
})
