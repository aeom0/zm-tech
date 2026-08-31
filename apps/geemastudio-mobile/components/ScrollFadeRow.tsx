import React, { useCallback, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

interface ScrollFadeRowProps {
  children: React.ReactNode
  /** Debe coincidir con el fondo detrás de la fila para que el degradado se funda bien. */
  backgroundColor: string
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  fadeWidth?: number
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled'
  /** Muestra flechitas tocables sobre el degradado para avanzar/retroceder el scroll. */
  showArrows?: boolean
  arrowColor?: string
}

const SCROLL_EPSILON = 4

/** Fila con scroll horizontal que muestra un fundido (y flechitas opcionales) en los bordes cuando hay más contenido fuera de vista. */
export function ScrollFadeRow({
  children,
  backgroundColor,
  contentContainerStyle,
  style,
  fadeWidth = 28,
  keyboardShouldPersistTaps,
  showArrows = false,
  arrowColor = '#FFFFFF',
}: ScrollFadeRowProps) {
  const scrollRef = useRef<ScrollView>(null)
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

  const step = Math.max(layoutWidth * 0.7, 80)

  const scrollBack = useCallback(() => {
    scrollRef.current?.scrollTo({ x: Math.max(0, scrollX - step), animated: true })
  }, [scrollX, step])

  const scrollForward = useCallback(() => {
    scrollRef.current?.scrollTo({
      x: Math.min(contentWidth - layoutWidth, scrollX + step),
      animated: true,
    })
  }, [scrollX, step, contentWidth, layoutWidth])

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      <ScrollView
        ref={scrollRef}
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
          pointerEvents={showArrows ? 'box-none' : 'none'}
        >
          {showArrows && (
            <Pressable onPress={scrollBack} hitSlop={8} style={styles.arrowTap}>
              <Feather name="chevron-left" size={16} color={arrowColor} />
            </Pressable>
          )}
        </LinearGradient>
      )}
      {showRightFade && (
        <LinearGradient
          colors={[`${backgroundColor}00`, backgroundColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeRight, { width: fadeWidth }]}
          pointerEvents={showArrows ? 'box-none' : 'none'}
        >
          {showArrows && (
            <Pressable onPress={scrollForward} hitSlop={8} style={styles.arrowTap}>
              <Feather name="chevron-right" size={16} color={arrowColor} />
            </Pressable>
          )}
        </LinearGradient>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
  arrowTap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
