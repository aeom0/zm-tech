import { useEffect } from 'react'
import { View } from 'react-native'
import type { ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated'

export const DashboardAnimatedView = Animated.createAnimatedComponent(View)

export type DashboardAnimatedStyle = AnimatedStyle<ViewStyle>

function useStaggerSlot() {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(24)
  const scale = useSharedValue(0.96)
  return { opacity, translateY, scale }
}

export function useStaggeredAnimation(isLoading: boolean) {
  const s0 = useStaggerSlot()
  const s1 = useStaggerSlot()
  const s2 = useStaggerSlot()
  const s3 = useStaggerSlot()
  const s4 = useStaggerSlot()
  const s5 = useStaggerSlot()
  const s6 = useStaggerSlot()
  const s7 = useStaggerSlot()

  useEffect(() => {
    if (!isLoading) {
      ;[s0, s1, s2, s3, s4, s5, s6, s7].forEach((anim, index) => {
        const delay = index * 80
        anim.opacity.value = withDelay(
          delay,
          withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) })
        )
        anim.translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 200 }))
        anim.scale.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 200 }))
      })
    }
    // s0–s7 conservan los mismos useSharedValue en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  const styles = [
    useAnimatedStyle(() => ({
      opacity: s0.opacity.value,
      transform: [{ translateY: s0.translateY.value }, { scale: s0.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s1.opacity.value,
      transform: [{ translateY: s1.translateY.value }, { scale: s1.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s2.opacity.value,
      transform: [{ translateY: s2.translateY.value }, { scale: s2.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s3.opacity.value,
      transform: [{ translateY: s3.translateY.value }, { scale: s3.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s4.opacity.value,
      transform: [{ translateY: s4.translateY.value }, { scale: s4.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s5.opacity.value,
      transform: [{ translateY: s5.translateY.value }, { scale: s5.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s6.opacity.value,
      transform: [{ translateY: s6.translateY.value }, { scale: s6.scale.value }],
    })),
    useAnimatedStyle(() => ({
      opacity: s7.opacity.value,
      transform: [{ translateY: s7.translateY.value }, { scale: s7.scale.value }],
    })),
  ]

  return styles
}
