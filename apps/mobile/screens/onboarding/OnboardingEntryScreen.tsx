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
 *
 * Glow: dos LinearGradient superpuestos en cruz simulando desvanecimiento radial.
 *   - Capa H: transparent → magenta(centro) → transparent  (izq→der)
 *   - Capa V: transparent → azul(centro)    → transparent  (arr→aba)
 *   Resultado: color muy suave en el centro, bordes completamente disueltos.
 *
 * Diamante: fotocromático, 304px (~95% del glow de 320px).
 * Desplazado 10px hacia abajo para dar aire al sparkle superior.
 * logoSection ocupa la mitad superior centrada (flex:1 + justifyContent:center).
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
          {/* Núcleo blanco — punto de luz central muy suave */}
          <LinearGradient
            colors={[
              "rgba(255, 255, 255, 0.10)",
              "rgba(255, 255, 255, 0.02)",
              "transparent",
            ]}
            locations={[0, 0.35, 1]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGlow}
          />
          {/* Capa magenta — diagonal ↘ */}
          <LinearGradient
            colors={[
              "rgba(233, 30, 140, 0.22)",
              "rgba(233, 30, 140, 0.06)",
              "transparent",
            ]}
            locations={[0, 0.4, 1]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGlow}
          />
          {/* Capa azul — diagonal ↗ */}
          <LinearGradient
            colors={[
              "rgba(21, 101, 192, 0.18)",
              "rgba(21, 101, 192, 0.04)",
              "transparent",
            ]}
            locations={[0, 0.4, 1]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0, y: 1 }}
            style={styles.logoGlow}
          />
          {/* Capa violeta — arriba para el sparkle */}
          <LinearGradient
            colors={[
              "rgba(156, 39, 176, 0.12)",
              "rgba(156, 39, 176, 0.03)",
              "transparent",
            ]}
            locations={[0, 0.3, 1]}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.logoGlow}
          />
          {/* Diamante fotocromático */}
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
    overflow: "hidden",
    borderRadius: 999,
  },
  logoGlow: {
    position: "absolute",
    width: "280%",
    height: "280%",
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
