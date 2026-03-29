import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;

/** Colores del gradiente Lunaris (135°) */
const LUNARIS: readonly [string, string, string, string] = [
  "#E91E8C",
  "#9C27B0",
  "#3D3D8F",
  "#1565C0",
];

interface DiamondHeroProps {
  /** Mostrar wordmark "SalonPro" y tagline debajo del diamante. Default: true */
  showText?: boolean;
}

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * NebulosaGlow + DiamondSparkle + wordmark SalonPro + tagline.
 *
 * Wordmark: "Salon" Poppins ExtraBold blanco + "Pro" Poppins ExtraBold
 * con gradiente Lunaris vía MaskedView.
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
          {/* Wordmark SalonPro */}
          <View style={styles.wordmarkRow}>
            {/* "Salon" — Poppins ExtraBold, blanco puro */}
            <Text style={styles.wordmarkSalon}>Salon</Text>

            {/* "Pro" — Poppins ExtraBold, gradiente Lunaris */}
            <MaskedView
              maskElement={
                <Text style={[styles.wordmarkPro, styles.wordmarkProMask]}>
                  Pro
                </Text>
              }
            >
              <LinearGradient
                colors={LUNARIS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.proGradient}
              >
                <Text style={[styles.wordmarkPro, styles.wordmarkProTransparent]}>
                  Pro
                </Text>
              </LinearGradient>
            </MaskedView>
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

const WORDMARK_SIZE = 38;

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
    gap: 0,
  },
  wordmarkSalon: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: WORDMARK_SIZE,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  wordmarkPro: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: WORDMARK_SIZE,
    includeFontPadding: false,
  },
  wordmarkProMask: {
    color: "#000000",
  },
  wordmarkProTransparent: {
    color: "transparent",
  },
  proGradient: {
    borderRadius: 0,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
