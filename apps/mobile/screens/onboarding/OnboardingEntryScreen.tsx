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

/**
 * Entrada al onboarding: fondo sólido #111318, CTAs Lunaris.
 *
 * Halo: NebulosaGlow (SVG radiales magenta + cian + feGaussianBlur) detrás del diamante;
 * sin overflow/borderRadius que recorten el aura.
 *
 * Diamante: fotocromático; desplazado 10px abajo para aire al sparkle superior.
 */
export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <OnboardingLayout centered>
      {/* Logo + tagline pequeño */}
      <Animated.View
        entering={FadeInUp.duration(500)}
        style={styles.logoSection}
      >
        <View style={styles.logoStack}>
          <NebulosaGlow size={320} />
          <View style={styles.diamondWrapper}>
            <DiamondSparkle size={312} />
          </View>
        </View>
        <ThemedText style={styles.taglineSmall}>
          Tu negocio en un solo lugar
        </ThemedText>
      </Animated.View>

      {/* Hero title — ocupa el espacio central */}
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

      {/* Botones al fondo */}
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
  },
  logoStack: {
    width: 320,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  /**
   * Wrapper del diamante: desplaza el SVG 10px hacia abajo dentro del stack
   * para que el sparkle superior quede visible sobre el borde del glow.
   */
  diamondWrapper: {
    position: "absolute",
    top: 10, // desplazamiento hacia abajo
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "flex-start",
    paddingBottom: Spacing.lg,
  },
  /** Wordmark discreto encima del titular */
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
