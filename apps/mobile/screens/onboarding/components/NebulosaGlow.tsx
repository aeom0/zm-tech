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
 * Dos círculos perfectos (rx=ry) con 50px de separación total entre centros,
 * simétricos respecto al centro del SVG:
 *   - Magenta (#E91E8C) cx = centro - 25
 *   - Azul Lunaris (#1565C0) cx = centro + 25
 * Muy solapados → se perciben como un solo círculo con transición de color.
 */
export function NebulosaGlow({ size = 420 }: NebulosaGlowProps) {
  const s = size;
  const ratio = s / 420;
  const center = s / 2;

  const mCx   = center - 25 * ratio;  // 185 en base 420
  const bCx   = center + 25 * ratio;  // 235 en base 420
  const cy    = center;
  const r     = 155 * ratio;
  const gScale = 175 * ratio;
  const blur  = 42 * ratio;
  const fPad  = s * 0.8;

  return (
    <Svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={styles.svg}
      pointerEvents="none"
    >
      <Defs>
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
    left: -50,
    top: -50,
  },
});
