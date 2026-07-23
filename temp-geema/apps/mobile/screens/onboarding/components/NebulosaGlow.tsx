import React from "react";
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
 *   - Turquesa (#40E0D0) cx = centro - 25
 *   - Índigo Lunaris (#3949AB) cx = centro + 25
 * Muy solapados → se perciben como un solo círculo con transición de color.
 *
 * OPACIDADES ASIMÉTRICAS INTENCIONALES:
 * El turquesa #40E0D0 (luminosidad ~76%) y el índigo #3949AB (luminosidad ~35%)
 * no tienen el mismo peso visual en fondo oscuro.
 * Para que ambos se perciban con intensidad equivalente:
 *   turquesa  → stopOpacity 0.60 (como antes, ya se ve bien)
 *   índigo    → stopOpacity 0.85 (compensación por menor luminosidad)
 *
 * NOTA DE POSICIONAMIENTO: el padre (DiamondHero) posiciona este componente.
 * NOTA DE FONDO: backgroundColor transparent elimina bounding box en web.
 */
export function NebulosaGlow({ size = 420 }: NebulosaGlowProps) {
  const s = size;
  const ratio = s / 420;
  const center = s / 2;

  const mCx = center - 25 * ratio; // turquesa, izquierda: 185 en base 420
  const bCx = center + 25 * ratio; // índigo, derecha:     235 en base 420
  const cy = center;
  const r = 155 * ratio;
  const gScale = 175 * ratio;
  const blur = 42 * ratio;
  const fPad = s * 0.8;

  return (
    <Svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      pointerEvents="none"
      style={{
        overflow: "visible",
        backgroundColor: "transparent",
      }}
    >
      <Defs>
        {/* Turquesa — opacidad estándar, alta luminosidad natural */}
        <RadialGradient
          id="glowTurquoise"
          cx={mCx}
          cy={cy}
          rx={gScale}
          ry={gScale}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor="#40E0D0" stopOpacity={0.60} />
          <Stop offset="0.5" stopColor="#40E0D0" stopOpacity={0.25} />
          <Stop offset="1"   stopColor="#40E0D0" stopOpacity={0} />
        </RadialGradient>

        {/* Índigo — opacidad aumentada para compensar menor luminosidad */}
        <RadialGradient
          id="glowIndigo"
          cx={bCx}
          cy={cy}
          rx={gScale}
          ry={gScale}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0"   stopColor="#3949AB" stopOpacity={0.85} />
          <Stop offset="0.5" stopColor="#3949AB" stopOpacity={0.40} />
          <Stop offset="1"   stopColor="#3949AB" stopOpacity={0} />
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
        <Ellipse cx={mCx} cy={cy} rx={r} ry={r} fill="url(#glowTurquoise)" />
        <Ellipse cx={bCx} cy={cy} rx={r} ry={r} fill="url(#glowIndigo)" />
      </G>
    </Svg>
  );
}
