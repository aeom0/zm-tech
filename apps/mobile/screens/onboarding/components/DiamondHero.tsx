import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Gradients, Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;
// Offset para centrar el glow (mayor que el stack) exactamente sobre el diamante.
// Fórmula: (STACK_SIZE - GLOW_SIZE) / 2 = -50
const GLOW_OFFSET = (STACK_SIZE - GLOW_SIZE) / 2;

interface DiamondHeroProps {
  /** Mostrar wordmark "GeemaStudio" y tagline debajo del diamante. Default: true */
  showText?: boolean;
}

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * NebulosaGlow + DiamondSparkle + wordmark GeemaStudio + tagline.
 *
 * Wordmark: "Geema" + "Studio" ambas Poppins ExtraBold, mismo fontSize y lineHeight.
 * MaskedView hereda el tamaño del LinearGradient — si studioGradient.width < texto
 * la última letra queda fuera del mask y no se renderiza (bug Android).
 * Solución: studioGradient.width generoso (160) para que "Studio" quepa siempre.
 *
 * Gradiente: consume Gradients.onboarding desde theme.ts — fuente de verdad única.
 *
 * Posicionamiento del glow: NebulosaGlow no define su propio position:absolute.
 * DiamondHero lo posiciona con GLOW_OFFSET = (STACK_SIZE - GLOW_SIZE) / 2
 * para centrado matemáticamente correcto sin magic numbers en el hijo.
 */
export function DiamondHero({ showText = true }: DiamondHeroProps) {
  return (
    <View style={styles.container}>
      {/* Glow + diamante */}
      <View style={styles.logoStack}>
        {/* Glow posicionado por el padre para centrado correcto */}
        <View style={styles.glowWrapper}>
          <NebulosaGlow size={GLOW_SIZE} />
        </View>
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {showText && (
        <>
          {/* Wordmark GeemaStudio */}
          <View style={styles.wordmarkRow}>
            {/* "Geema" — Poppins ExtraBold, blanco puro */}
            <Text style={styles.wordmarkGeema}>Geema</Text>

            {/* "Studio" — Poppins ExtraBold, gradiente Lunaris vía MaskedView.
                studioGradient.width debe ser >= ancho real del texto en pantalla.
                Con fontSize 38 + Poppins ExtraBold, "Studio" mide ~145px en Android.
                Usamos 160 para tener margen holgado sin distorsionar el gradiente. */}
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
  glowWrapper: {
    position: "absolute",
    left: GLOW_OFFSET,
    top: GLOW_OFFSET,
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
    // 160px: ancho holgado para que "Studio" (Poppins ExtraBold 38px)
    // no quede truncado en Android. El gradiente sigue siendo visualmente correcto
    // porque el mask recorta el área visible al contorno exacto del texto.
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
