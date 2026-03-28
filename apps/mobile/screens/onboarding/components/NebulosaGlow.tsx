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
 * Dos elipses verticales solapadas horizontalmente:
 *   - Magenta (#E91E8C) centrada a la izquierda
 *   - Azul Lunaris (#1565C0) centrada a la derecha
 *
 * Opacidades suaves + blur fuerte (stdDeviation=45) para evitar
 * bordes definidos — la nebulosa se desvanece naturalmente.
 */
export function NebulosaGlow({ size = 420 }: NebulosaGlowProps) {
  const s = size;
  const ratio = s / 420;

  const mCx  = 140 * ratio;
  const bCx  = 280 * ratio;
  const cy   = 210 * ratio;
  const rx   = 130 * ratio;
  const ry   = 200 * ratio;
  const blur = 45 * ratio;
  const fPad = 160 * ratio;

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
          rx={rx}
          ry={ry}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor="#E91E8C" stopOpacity={0.55} />
          <Stop offset="0.5" stopColor="#E91E8C" stopOpacity={0.20} />
          <Stop offset="1"   stopColor="#E91E8C" stopOpacity={0} />
        </RadialGradient>

        {/* Azul — token gradient-onboarding-end */}
        <RadialGradient
          id="glowBlue"
          cx={bCx}
          cy={cy}
          rx={rx}
          ry={ry}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor="#1565C0" stopOpacity={0.55} />
          <Stop offset="0.5" stopColor="#1565C0" stopOpacity={0.20} />
          <Stop offset="1"   stopColor="#1565C0" stopOpacity={0} />
        </RadialGradient>

        {/* Región del filtro generosa para que el blur no recorte los bordes */}
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
        <Ellipse cx={mCx} cy={cy} rx={rx} ry={ry} fill="url(#glowMagenta)" />
        <Ellipse cx={bCx} cy={cy} rx={rx} ry={ry} fill="url(#glowBlue)" />
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
