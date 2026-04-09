import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { DiamondSparkle } from "./DiamondSparkle";
import { NebulosaGlow } from "./NebulosaGlow";
import { Gradients, Spacing } from "@/constants/theme";

const STACK_SIZE = 320;
const GLOW_SIZE = 420;
// Offset para centrar el glow exactamente sobre el logoStack.
const GLOW_OFFSET = (STACK_SIZE - GLOW_SIZE) / 2;
// El diamante se desplaza hacia arriba dentro del blob de luz
// para que el glow quede más centrado en la parte inferior del diamante.
const DIAMOND_OFFSET_TOP = -20;

interface DiamondHeroProps {
  /** Mostrar wordmark "GeemaStudio" y tagline debajo del diamante. Default: true */
  showText?: boolean;
}

/**
 * Componente compartido entre OnboardingEntryScreen y SplashScreen.
 * NebulosaGlow + DiamondSparkle + wordmark GeemaStudio + tagline.
 *
 * Wordmark centrado: wordmarkRow tiene width fijo (WORDMARK_TOTAL_WIDTH)
 * para que el bloque completo "Geema" + "Studio" esté alineado al centro
 * del diamante independientemente del ancho del MaskedView.
 *
 * Diamante desplazado: DIAMOND_OFFSET_TOP = -20 sube el diamante
 * respecto al centro del glow para mejor composición visual.
 */
export function DiamondHero({ showText = true }: DiamondHeroProps) {
  return (
    <View style={styles.container}>
      {/* Glow + diamante */}
      <View style={styles.logoStack}>
        <View style={styles.glowWrapper}>
          <NebulosaGlow size={GLOW_SIZE} />
        </View>
        <View style={styles.diamondWrapper}>
          <DiamondSparkle size={320} />
        </View>
      </View>

      {showText && (
        <>
          {/* Wordmark GeemaStudio — ancho fijo para centrado correcto */}
          <View style={styles.wordmarkRow}>
            {/* "Geema" — Poppins ExtraBold, blanco puro */}
            <Text style={styles.wordmarkGeema}>Geema</Text>

            {/* "Studio" — gradiente Lunaris vía MaskedView.
                studioGradient.width (160) >= ancho real del texto en Android
                para que la última letra no quede fuera del mask. */}
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
    // Sube el diamante respecto al centro del glow para mejor composición.
    // El glow queda más visible en la parte inferior/derecha del diamante.
    top: DIAMOND_OFFSET_TOP,
  },
  wordmarkRow: {
    flexDirection: "row",
    // alignItems flex-end alinea la base tipográfica de Geema y Studio.
    alignItems: "flex-end",
    // justifyContent center dentro del container (que ya es alignItems:center)
    // garantiza que el bloque completo esté centrado bajo el diamante.
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
    // 160px: holgado para que "Studio" (Poppins ExtraBold 38px ~145px)
    // no quede truncado en Android. El mask recorta al contorno del texto.
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
