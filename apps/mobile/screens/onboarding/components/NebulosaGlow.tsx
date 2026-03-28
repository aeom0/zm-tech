import React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  FeGaussianBlur,
  Filter,
  G,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface NebulosaGlowProps {
  /** Lado del cuadrado del halo (coincide con logoStack). */
  size?: number;
}

/**
 * Halo tipo nebulosa detrás del diamante.
 *
 * Dirección: magenta en esquina superior-izquierda, azul Lunaris en inferior-derecha.
 * Las manchas se solapan en el centro creando la mezcla característica del mockup.
 * El SVG se renderiza más grande que el stack (size=420 desde EntryScreen)
 * y se centra con left/top negativos para que el glow sangre hacia los bordes.
 */
export function NebulosaGlow({ size = 420 }: NebulosaGlowProps) {
  const s = size;

  // Magenta — esquina superior-izquierda
  const mCx = s * 0.28;
  const mCy = s * 0.25;
  const mR = s * 0.72;

  // Azul Lunaris — esquina inferior-derecha
  const cCx = s * 0.72;
  const cCy = s * 0.72;
  const cR = s * 0.68;

  // Padding del filtro — generoso para que el blur no se recorte en los bordes
  const fPad = s * 0.55;

  return (
    <Svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={styles.svg}
      pointerEvents="none"
    >
      <Defs>
        {/* Magenta — token gradient-onboarding-start */}
        <RadialGradient
          id="nebulaMagenta"
          cx={mCx}
          cy={mCy}
          r={mR}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#E91E8C" stopOpacity={0.75} />
          <Stop offset="0.35" stopColor="#E91E8C" stopOpacity={0.35} />
          <Stop offset="0.65" stopColor="#E91E8C" stopOpacity={0.08} />
          <Stop offset="0.85" stopColor="#E91E8C" stopOpacity={0} />
          <Stop offset="1" stopColor="#E91E8C" stopOpacity={0} />
        </RadialGradient>

        {/* Azul Lunaris — token gradient-onboarding-end */}
        <RadialGradient
          id="nebulaBlue"
          cx={cCx}
          cy={cCy}
          r={cR}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#1565C0" stopOpacity={0.65} />
          <Stop offset="0.32" stopColor="#1565C0" stopOpacity={0.28} />
          <Stop offset="0.62" stopColor="#1565C0" stopOpacity={0.07} />
          <Stop offset="0.82" stopColor="#1565C0" stopOpacity={0} />
          <Stop offset="1" stopColor="#1565C0" stopOpacity={0} />
        </RadialGradient>

        <Filter
          id="nebulaBlur"
          x={-fPad}
          y={-fPad}
          width={s + fPad * 2}
          height={s + fPad * 2}
          filterUnits="userSpaceOnUse"
        >
          <FeGaussianBlur in="SourceGraphic" stdDeviation={48} />
        </Filter>
      </Defs>

      <G filter="url(#nebulaBlur)">
        <Circle cx={mCx} cy={mCy} r={mR} fill="url(#nebulaMagenta)" />
        <Circle cx={cCx} cy={cCy} r={cR} fill="url(#nebulaBlue)" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: "absolute",
    // Centra el SVG (420px) sobre el logoStack (320px): (420-320)/2 = 50
    left: -50,
    top: -50,
  },
});
