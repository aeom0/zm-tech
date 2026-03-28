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

// Tamaño base del stack del diamante
const STACK_SIZE = 320;
// El glow es 1.4x el stack — sangra ~64px a cada lado
const GLOW_SIZE = Math.round(STACK_SIZE * 1.4); // 448
const GLOW_OFFSET = (GLOW_SIZE - STACK_SIZE) / 2; // 64

/**
 * Entrada al onboarding: fondo sólido #111318, CTAs Lunaris.
 *
 * Halo: NebulosaGlow con LinearGradient horizontal puro (0°)
 * magenta izquierda → azul derecha, sin feGaussianBlur.
 * Se posiciona con left/top negativos para centrar el overflow.
 *
 * Diamante: fotocromático 152px; desplazado 10px abajo.
 */
export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <OnboardingLayout centered>
      {/* Logo + tagline */}
      <Animated.View
        entering={FadeInUp.duration(500)}
        style={styles.logoSection}
      >
        <View style={styles.logoStack}>
          {/* Glow más grande que el stack, centrado con offset negativo */}
          <NebulosaGlow
            size={GLOW_SIZE}
          />
          <View
            style={[
              styles.glowPositioner,
              { left: -GLOW_OFFSET, top: -GLOW_OFFSET },
            ]}
          />
          <View style={styles.diamondWrapper}>
            <DiamondSparkle size={152} />
          </View>
        </View>
        <ThemedText style={styles.taglineSmall}>
          Tu negocio en un solo lugar
        </ThemedText>
      </Animated.View>

      {/* Hero title */}
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

      {/* Botones */}
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
    // overflow visible para que el glow (448px) escape del stack (320px)
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
  // View vacío que no hace nada — el glow ya está absoluto en NebulosaGlow
  glowPositioner: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    pointerEvents: "none",
  },
  diamondWrapper: {
    position: "absolute",
    top: 10,
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
