import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Gradients, Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;
const GLOW_OFFSET = (STACK_SIZE - GLOW_SIZE) / 2;

// Desplazamiento del glow hacia abajo para que el diamante quede
// visualmente en la mitad superior del blob de luz.
// Se mueve el GLOW (no el diamante) para mantener el diamante
// centrado exactamente en el logoStack via alignItems/justifyContent.
const GLOW_VERTICAL_SHIFT = 20;

interface DiamondHeroProps {
  showText?: boolean;
}

export function DiamondHero({ showText = true }: DiamondHeroProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoStack}>
        {/* Glow desplazado hacia abajo para que el diamante quede
            en la mitad superior del blob — efecto visual equivalente
            a subir el diamante pero sin romper su centrado flex. */}
        <View style={styles.glowWrapper}>
          <NebulosaGlow size={GLOW_SIZE} />
        </View>
        {/* Diamante centrado exactamente por alignItems/justifyContent */}
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {showText && (
        <>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkGeema}>Geema</Text>
            <MaskedView
              maskElement={
                <Text
                  style={[styles.wordmarkStudio, styles.wordmarkStudioMask]}
                >
                  Studio
                </Text>
              }
            >
              <LinearGradient
                colors={[...Gradients.onboarding.colors]}
                locations={[...Gradients.onboarding.locations]}
                start={Gradients.onboarding.linearStart}
                end={Gradients.onboarding.linearEnd}
                style={styles.studioGradient}
              />
            </MaskedView>
          </View>

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
  glowWrapper: {
    position: "absolute",
    left: GLOW_OFFSET,
    // Desplazar el glow hacia abajo coloca el centro del blob
    // debajo del centro del diamante → efecto visual de diamante
    // flotando en la mitad superior del halo.
    top: GLOW_OFFSET + GLOW_VERTICAL_SHIFT,
  },
  diamondWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    // Sin top/bottom: centrado exacto por el layout del padre.
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 0,
  },
  wordmarkGeema: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  wordmarkStudio: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: WORDMARK_SIZE,
    lineHeight: WORDMARK_SIZE,
    includeFontPadding: false,
  },
  wordmarkStudioMask: {
    color: "#FFFFFF",
    backgroundColor: "transparent",
  },
  studioGradient: {
    width: 160,
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
