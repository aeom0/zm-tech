import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;

// Tokens Lunaris
const GRADIENT: [string, string, string] = ["#E91E8C", "#9C27B0", "#1565C0"];

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * NebulosaGlow + DiamondSparkle + wordmark "SalonPro" + tagline.
 *
 * Gradiente en texto via LinearGradient absoluto sobre Text transparente
 * (no requiere @react-native-masked-view).
 */
export function DiamondHero() {
  return (
    <View style={styles.container}>
      {/* Glow + diamante */}
      <View style={styles.logoStack}>
        <NebulosaGlow size={GLOW_SIZE} />
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {/* Wordmark SalonPro con gradiente */}
      <View style={styles.wordmarkContainer}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.wordmark}>SalonPro</Text>
      </View>

      {/* Tagline */}
      <ThemedText style={styles.tagline}>
        Pule tu negocio, Brilla en cada servicio.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
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
  wordmarkContainer: {
    borderRadius: 4,
    overflow: "hidden", // necesario para que LinearGradient quede recortado al texto
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  wordmark: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "rgba(255,255,255,0.92)",
    // El gradiente queda detrás del texto via absoluteFillObject
    // En RN puro no hay clip-to-text nativo sin masked-view,
    // por lo que el gradiente es el fondo del contenedor
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
});
