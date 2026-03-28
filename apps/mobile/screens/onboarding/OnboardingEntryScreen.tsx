import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  GradientCTAButton,
  DiamondSparkle,
  NebulosaGlow,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";

interface OnboardingEntryScreenProps {
  onCreateNew: () => void;
  onLoginExisting: () => void;
}

const STACK_SIZE = 320;
const GLOW_SIZE  = 420;
const GLOW_OFFSET = (GLOW_SIZE - STACK_SIZE) / 2; // 50 — coincide con left/top del SVG

export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <OnboardingLayout centered>
      <Animated.View
        entering={FadeInUp.duration(500)}
        style={styles.logoSection}
      >
        <View style={styles.logoStack}>
          <NebulosaGlow size={GLOW_SIZE} />
          {/* DiamondSparkle 320px centrado exactamente en el glow */}
          <View style={styles.diamondWrapper}>
            <DiamondSparkle size={320} />
          </View>
        </View>
        <ThemedText style={styles.taglineSmall}>
          Tu negocio en un solo lugar
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(500).delay(80)}
        style={styles.heroSection}
      >
        <ThemedText style={styles.heroBrand}>SalonPro</ThemedText>
        <ThemedText style={styles.heroTitle}>Gestiona tu estudio</ThemedText>
        <ThemedText style={styles.heroHighlight}>
          con estilo y precisión
        </ThemedText>
        <ThemedText style={styles.heroSub}>
          Citas, personal, finanzas e inventario{"\n"}todo en tu bolsillo.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(500).delay(160)}
        style={styles.bottomSection}
      >
        <GradientCTAButton
          label="Crear nuevo negocio"
          onPress={onCreateNew}
          style={styles.btnFull}
        />
        <GradientCTAButton
          variant="outline"
          label="Ya tengo cuenta"
          onPress={onLoginExisting}
          style={styles.btnFull}
        />
      </Animated.View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    overflow: "visible",
  },
  logoStack: {
    width: STACK_SIZE,
    height: STACK_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  diamondWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "flex-start",
    paddingBottom: Spacing.lg,
  },
  heroBrand: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 3.5,
    color: "rgba(255,255,255,0.52)",
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 48,
  },
  heroHighlight: {
    fontSize: 42,
    fontWeight: "700",
    color: "#E91E8C",
    lineHeight: 48,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 20,
    marginTop: Spacing.lg,
  },
  bottomSection: {
    gap: 12,
    width: "100%",
  },
  btnFull: {
    width: "100%",
  },
  taglineSmall: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
});
