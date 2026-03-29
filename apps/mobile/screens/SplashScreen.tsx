import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as SplashScreenExpo from "expo-splash-screen";
import { DiamondHero } from "@/screens/onboarding/components";

SplashScreenExpo.preventAutoHideAsync?.();

type SplashScreenProps = {
  onFinish: () => void;
};

/**
 * SplashScreen React — reutiliza DiamondHero (glow + diamante + SalonPro + tagline).
 * Animación: fade in del hero completo, luego fade out antes de onFinish.
 * Total: ~2000ms.
 */
export function SplashScreenComponent({ onFinish }: SplashScreenProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    let cancelled = false;

    async function animate() {
      await SplashScreenExpo.hideAsync?.();

      // Fade in + escala sutil
      opacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.back(1.1)),
      });

      // Fade out antes de terminar
      opacity.value = withDelay(1200, withTiming(0, { duration: 400 }));

      const timer = setTimeout(() => {
        if (!cancelled) runOnJS(onFinish)();
      }, 2000);

      return () => clearTimeout(timer);
    }

    const t = setTimeout(animate, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [onFinish, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, animatedStyle]}>
        <DiamondHero />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111318",
  },
  hero: {
    alignItems: "center",
    overflow: "visible",
  },
});
