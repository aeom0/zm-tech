import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { ThemedText } from "@/components/ThemedText";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * Renderiza: NebulosaGlow + DiamondSparkle + wordmark "SalonPro" + tagline.
 *
 * Sin dependencia de tenant — identidad fija de la plataforma.
 */
export function DiamondHero() {
  return (
    <View style={styles.container}>
      {/* Stack glow + diamante */}
      <View style={styles.logoStack}>
        <NebulosaGlow size={GLOW_SIZE} />
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {/* Wordmark SalonPro con gradiente magenta→azul */}
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <ThemedText style={styles.wordmark}>SalonPro</ThemedText>
        }
      >
        <LinearGradient
          colors={["#E91E8C", "#9C27B0", "#1565C0"]}
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
  maskedView: {
    height: 44,
    alignSelf: "center",
  },
  wordmark: {
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "#000000", // color del mask — no importa, solo define la forma
    backgroundColor: "transparent",
  },
  gradientFill: {
    flex: 1,
    width: 200,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
});
