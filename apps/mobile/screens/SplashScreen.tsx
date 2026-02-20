import React, { useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as SplashScreenExpo from "expo-splash-screen";
import { Colors, Spacing } from "@/constants/theme";

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
      {/* Decorative circles */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require("@/assets/images/logo/logo-positivo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={taglineAnimatedStyle}>
        <Animated.Text style={styles.tagline}>
          Tu belleza, nuestra pasión
        </Animated.Text>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.violet,
    paddingHorizontal: Spacing["2xl"],
  },
  circleTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circleBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(212,175,55,0.1)",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 240,
    height: 140,
    maxWidth: "85%",
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: Spacing.xl,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  dividerLine: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(212,175,55,0.5)",
  },
  dividerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.light.gold,
  },
});
