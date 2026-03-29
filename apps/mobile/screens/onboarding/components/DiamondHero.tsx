import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;

interface DiamondHeroProps {
  /** Mostrar wordmark "SalonPro" y tagline debajo del diamante. Default: true */
  showText?: boolean;
}

/**
 * Componente compartido entre OnboardingEntryScreen y la splash nativa (vía assets).
 * NebulosaGlow + DiamondSparkle + wordmark "SalonPro" blanco + tagline.
 */
export function DiamondHero({ showText = true }: DiamondHeroProps) {
  return (
    <View style={styles.container}>
      {/* Glow + diamante */}
      <View style={styles.logoStack}>
        <NebulosaGlow size={GLOW_SIZE} />
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {showText && (
        <>
          {/* Wordmark SalonPro — tipografía mixta, todo blanco */}
          <View style={styles.wordmarkRow}>
            {/* "Salon" — serif elegante via fontWeight 300 + letterSpacing amplio */}
            <Text style={styles.wordmarkSalon}>Salon</Text>
            {/* "Pro" — sans-serif bold condensado */}
            <Text style={styles.wordmarkPro}>Pro</Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Pule tu negocio · Brilla en cada servicio
          </Text>
        </>
      )}
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
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  // "Salon" — peso ligero, letras separadas, aspecto editorial/lujo
  wordmarkSalon: {
    fontSize: 38,
    fontWeight: "300",
    letterSpacing: 6,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  // "Pro" — bold, sin separación, contraste de peso
  wordmarkPro: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
