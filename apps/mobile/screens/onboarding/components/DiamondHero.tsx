import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Gradients, Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;

interface DiamondHeroProps {
  /** Mostrar wordmark "SalonPro" y tagline debajo del diamante. Default: true */
  showText?: boolean;
}

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * NebulosaGlow + DiamondSparkle + wordmark SalonPro + tagline.
 *
 * Wordmark: "Salon" + "Pro" ambas Poppins ExtraBold, mismo fontSize y lineHeight.
 * MaskedView hereda el tamaño del LinearGradient — si proGradient.height > fontSize
 * el bloque de Pro es más alto que Salon y con flex-end queda más abajo.
 * Solución: lineHeight === fontSize === proGradient.height === WORDMARK_SIZE.
 *
 * Gradiente: consume Gradients.onboarding desde theme.ts — fuente de verdad única.
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

            {/* "Pro" — Poppins ExtraBold, gradiente Lunaris vía MaskedView.
                proGradient.height === WORDMARK_SIZE para que MaskedView
                ocupe exactamente la misma altura que wordmarkSalon. */}
            <MaskedView
              maskElement={
                <Text style={[styles.wordmarkPro, styles.wordmarkProMask]}>
                  Pro
                </Text>
              }
            >
              <LinearGradient
                colors={[...Gradients.onboarding.colors]}
                locations={[...Gradients.onboarding.locations]}
                start={Gradients.onboarding.linearStart}
                end={Gradients.onboarding.linearEnd}
                style={styles.proGradient}
              />
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
    alignItems: "flex-end",
    gap: 0,
  },
  wordmarkSalon: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  wordmarkPro: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    includeFontPadding: false,
  },
  wordmarkProMask: {
    color: "#FFFFFF",
    backgroundColor: "transparent",
  },
  proGradient: {
    width: 90,
    height: WORDMARK_SIZE,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
