import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  GradientCTAButton,
  DiamondSparkle,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";

interface OnboardingEntryScreenProps {
  onCreateNew: () => void;
  onLoginExisting: () => void;
}

/**
 * Entrada al onboarding: fondo sólido #111318, CTAs Lunaris.
 * Glow: LinearGradient lineal izquierda→derecha (magenta #E91E8C → azul #1565C0).
 * Diamante fotocromático, tamaño = 90% del glow (144px sobre 160px).
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
          {/* Glow lineal: magenta → azul, izquierda → derecha */}
          <LinearGradient
            colors={["rgba(233, 30, 140, 0.30)", "rgba(21, 101, 192, 0.30)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.logoGlow}
          />
          {/* Diamante fotocromático — 90% del diámetro del glow (144/160) */}
          <DiamondSparkle size={144} />
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
        <ThemedText style={styles.heroTitle}>Gestiona tu salón</ThemedText>
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
    alignItems: "center",
    gap: Spacing.md,
  },
  logoStack: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
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
