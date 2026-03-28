import React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  G,
  RadialGradient,
  Stop,
} from "react-native-svg";

interface NebulosaGlowProps {
  /** Lado del cuadrado del halo. Desde EntryScreen se pasa 420. */
  size?: number;
}

/**
 * Halo tipo nebulosa detrás del diamante.
 *
 * Dos círculos casi perfectos (rx=ry) levemente desplazados del centro:
 *   - Magenta (#E91E8C) cx ligeramente a la izquierda
 *   - Azul Lunaris (#1565C0) cx ligeramente a la derecha
 * Muy solapados → se perciben como un solo círculo con transición de color.
 * Blur parejo en todas direcciones (región -80%) → sin bordes definidos.
 */
export function NebulosaGlow({ size = 420 }: NebulosaGlowProps) {
  const s = size;
  const ratio = s / 420;

  const mCx  = 175 * ratio;
  const bCx  = 245 * ratio;
  const cy   = 210 * ratio;
  const r    = 155 * ratio;  // rx = ry → círculo perfecto
  const gScale = 175 * ratio;
  const blur = 42 * ratio;
  const fPad = s * 0.8;      // región generosa para blur parejo

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
          id="glowMagenta"
          cx={mCx}
          cy={cy}
          rx={gScale}
          ry={gScale}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor="#E91E8C" stopOpacity={0.60} />
          <Stop offset="0.5" stopColor="#E91E8C" stopOpacity={0.25} />
          <Stop offset="1"   stopColor="#E91E8C" stopOpacity={0} />
        </RadialGradient>

        {/* Azul — token gradient-onboarding-end */}
        <RadialGradient
          id="glowBlue"
          cx={bCx}
          cy={cy}
          rx={gScale}
          ry={gScale}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor="#1565C0" stopOpacity={0.60} />
          <Stop offset="0.5" stopColor="#1565C0" stopOpacity={0.25} />
          <Stop offset="1"   stopColor="#1565C0" stopOpacity={0} />
        </RadialGradient>

        {/* Región generosa (-80%) para que el blur sea parejo en todas direcciones */}
        <Filter
          id="nebulaBlur"
          x={-fPad}
          y={-fPad}
          width={s + fPad * 2}
          height={s + fPad * 2}
          filterUnits="userSpaceOnUse"
        >
          <FeGaussianBlur in="SourceGraphic" stdDeviation={blur} />
        </Filter>
      </Defs>

      <G filter="url(#nebulaBlur)">
        <Ellipse cx={mCx} cy={cy} rx={r} ry={r} fill="url(#glowMagenta)" />
        <Ellipse cx={bCx} cy={cy} rx={r} ry={r} fill="url(#glowBlue)" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: "absolute",
    // Centra el SVG (420) sobre el logoStack (320): (420-320)/2 = 50
    left: -50,
    top: -50,
  },
});
