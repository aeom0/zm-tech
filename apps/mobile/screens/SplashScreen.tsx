import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as SplashScreenExpo from "expo-splash-screen";
import { Spacing } from "@/constants/theme";

SplashScreenExpo.preventAutoHideAsync?.();

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreenComponent({ onFinish }: SplashScreenProps) {
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(15);
  const shimmerTranslate = useSharedValue(-200);

  useEffect(() => {
    let cancelled = false;

    async function animate() {
      await SplashScreenExpo.hideAsync?.();

      // Logo fade in + scale
      logoOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
      logoScale.value = withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.back(1.2)),
      });

      // Tagline slide up
      taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
      taglineTranslateY.value = withDelay(
        400,
        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );

      // Shimmer effect on logo
      shimmerTranslate.value = withDelay(
        600,
        withTiming(200, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      );

      // Finish after animation
      const timer = setTimeout(() => {
        if (!cancelled) {
          runOnJS(onFinish)();
        }
      }, 1800);

      return () => clearTimeout(timer);
    }

    const t = setTimeout(animate, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    onFinish,
    logoScale,
    logoOpacity,
    taglineOpacity,
    taglineTranslateY,
    shimmerTranslate,
  ]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require("@/assets/splash-logo.png")}
          style={styles.logoImage}
          contentFit="contain"
          accessibilityLabel="SalonPro"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      <Animated.View style={taglineAnimatedStyle}>
        <Animated.Text style={styles.tagline}>
          Configura tu salón en minutos
        </Animated.Text>
        <Animated.Text style={styles.subtagline}>
          Agenda, equipo e inventario en un solo lugar.
        </Animated.Text>
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
    paddingHorizontal: Spacing["2xl"],
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 112,
    height: 112,
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: Spacing.lg,
    letterSpacing: 0.5,
  },
  subtagline: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
