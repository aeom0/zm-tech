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
 * Halo tipo nebulosa detrás del diamante: dos radiales (magenta + cian)
 * con opacidad 0 antes del borde del gradiente y desenfoque gaussiano para mezcla suave.
 */
export function NebulosaGlow({ size = 320 }: NebulosaGlowProps) {
  const s = size;
  const mCx = s * 0.42;
  const mCy = s * 0.36;
  const mR = s * 0.5;
  const cCx = s * 0.58;
  const cCy = s * 0.56;
  const cR = s * 0.46;
  const fPad = s * 0.42;

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
          id="nebulaMagenta"
          cx={mCx}
          cy={mCy}
          r={mR}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#E91E8C" stopOpacity={0.52} />
          <Stop offset="0.38" stopColor="#E91E8C" stopOpacity={0.22} />
          <Stop offset="0.66" stopColor="#E91E8C" stopOpacity={0.06} />
          <Stop offset="0.86" stopColor="#E91E8C" stopOpacity={0} />
          <Stop offset="1" stopColor="#E91E8C" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id="nebulaCyan"
          cx={cCx}
          cy={cCy}
          r={cR}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#00F2FF" stopOpacity={0.42} />
          <Stop offset="0.36" stopColor="#00F2FF" stopOpacity={0.16} />
          <Stop offset="0.64" stopColor="#00F2FF" stopOpacity={0.05} />
          <Stop offset="0.84" stopColor="#00F2FF" stopOpacity={0} />
          <Stop offset="1" stopColor="#00F2FF" stopOpacity={0} />
        </RadialGradient>
        <Filter
          id="nebulaBlur"
          x={-fPad}
          y={-fPad}
          width={s + fPad * 2}
          height={s + fPad * 2}
          filterUnits="userSpaceOnUse"
        >
          <FeGaussianBlur in="SourceGraphic" stdDeviation={35} />
        </Filter>
      </Defs>
      <G filter="url(#nebulaBlur)">
        <Circle cx={mCx} cy={mCy} r={mR} fill="url(#nebulaMagenta)" />
        <Circle cx={cCx} cy={cCy} r={cR} fill="url(#nebulaCyan)" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
