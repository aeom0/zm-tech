import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface NebulosaGlowProps {
  /**
   * Lado del cuadrado del halo.
   * Debe ser >= logoStack para que el glow sangre fuera del diamante.
   * Desde OnboardingEntryScreen se pasa size = logoStack * 1.4
   */
  size?: number;
}

/**
 * Halo tipo nebulosa con dirección estrictamente horizontal (0°).
 *
 * Usa LinearGradient SVG — dos capas superpuestas:
 *   1. Magenta (#E91E8C) de izquierda a derecha, desvanece al 60%
 *   2. Azul (#1565C0) de derecha a izquierda, desvanece al 60%
 * La mezcla en el centro produce el efecto magenta-índigo-azul del mockup.
 *
 * Sin feGaussianBlur (no funciona en Android).
 * El SVG se posiciona centrado sobre el logoStack con left/top negativos.
 */
export function NebulosaGlow({ size = 448 }: NebulosaGlowProps) {
  const s = size;

  return (
    <Svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={styles.svg}
      pointerEvents="none"
    >
      <Defs>
        {/* Magenta: izquierda (opaco) → derecha (transparente) */}
        <LinearGradient
          id="glowMagenta"
          x1="0"
          y1="0.5"
          x2="1"
          y2="0.5"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor="#E91E8C" stopOpacity={0.85} />
          <Stop offset="0.45" stopColor="#E91E8C" stopOpacity={0.4} />
          <Stop offset="0.75" stopColor="#E91E8C" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#E91E8C" stopOpacity={0} />
        </LinearGradient>

        {/* Azul: derecha (opaco) → izquierda (transparente) */}
        <LinearGradient
          id="glowBlue"
          x1="1"
          y1="0.5"
          x2="0"
          y2="0.5"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor="#1565C0" stopOpacity={0.85} />
          <Stop offset="0.45" stopColor="#1565C0" stopOpacity={0.4} />
          <Stop offset="0.75" stopColor="#1565C0" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#1565C0" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Capa magenta — izquierda */}
      <Rect x={0} y={0} width={s} height={s} fill="url(#glowMagenta)" />

      {/* Capa azul — derecha, superpuesta con mezcla por opacidad */}
      <Rect x={0} y={0} width={s} height={s} fill="url(#glowBlue)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: "absolute",
    // Se calcula en OnboardingEntryScreen con el offset correcto
    left: 0,
    top: 0,
  },
});
