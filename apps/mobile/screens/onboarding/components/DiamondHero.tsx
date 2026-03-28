import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { ThemedText } from "@/components/ThemedText";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;
const GRADIENT_COLORS: [string, string, string] = ["#E91E8C", "#9C27B0", "#1565C0"];

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * NebulosaGlow + DiamondSparkle + wordmark "SalonPro" con gradiente + tagline.
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

      {/* Wordmark SalonPro — gradiente dentro de las letras */}
      <MaskedView
        style={styles.maskedWordmark}
        maskElement={
          <View style={styles.maskCenter}>
            <Text style={styles.wordmark}>SalonPro</Text>
          </View>
        }
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientFill}
        />
      </MaskedView>

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
  maskedWordmark: {
    height: 44,
  },
  maskCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  wordmark: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "black", // define la forma del mask — el color no importa
  },
  gradientFill: {
    flex: 1,
    width: 220,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
});
