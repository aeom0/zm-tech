import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import type {
  FdiToothNumber,
  OdontogramToothState,
  ToothConditionDef,
  ToothSurface,
} from "@odentalpro/dental-schema";
import {
  TOOTH_CONDITIONS_BY_ID,
  conditionFillColor,
  conditionStrokeColor,
} from "@odentalpro/dental-schema";

const W = 40;
const H = 94;
const CROWN_R = 9;
const RING_OUTER = 15;
const RING_INNER = 7;
const ROOT_H = 22;

const NEUTRAL_STROKE = "#475569";
const NEUTRAL_FILL = "#0f172a";
const BAD_STROKE_WIDTH = 2;

/**
 * Centros verticales de las 3 capas según la arcada, imitando la disposición
 * clínica de la referencia (Dentalink): en superiores la raíz apunta hacia
 * arriba y el anillo de superficies queda pegado a la línea de números
 * central; en inferiores es el espejo.
 */
const LAYOUT = {
  upper: { root: 16, crown: 44, ring: 78 },
  lower: { ring: 16, crown: 50, root: 78 },
} as const;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Path de una cuña de dona entre dos radios y dos ángulos (0° = arriba, sentido horario). */
function donutWedge(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polar(cx, cy, rOuter, startAngle);
  const endOuter = polar(cx, cy, rOuter, endAngle);
  const startInner = polar(cx, cy, rInner, endAngle);
  const endInner = polar(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

/** Silueta de raíz: ancha del lado de la corona, afinándose hacia el ápice. */
function rootPath(cx: number, cy: number, pointing: "up" | "down") {
  const half = ROOT_H / 2;
  if (pointing === "down") {
    return `M${cx - 7} ${cy - half} Q${cx} ${cy - half - 4} ${cx + 7} ${cy - half} L${cx + 3} ${cy + half} Q${cx} ${cy + half + 3} ${cx - 3} ${cy + half} Z`;
  }
  return `M${cx - 7} ${cy + half} Q${cx} ${cy + half + 4} ${cx + 7} ${cy + half} L${cx + 3} ${cy - half} Q${cx} ${cy - half - 3} ${cx - 3} ${cy - half} Z`;
}

const RING_ANGLES: Record<"top" | "right" | "bottom" | "left", [number, number]> = {
  top: [-45, 45],
  right: [45, 135],
  bottom: [135, 225],
  left: [225, 315],
};

/**
 * En el anillo, la cuña superior siempre es vestibular y la inferior
 * lingual/palatina; mesial/distal dependen del lado de la línea media en que
 * está la pieza (mesial siempre apunta hacia la línea media).
 */
function ringSurfaceForSide(
  side: "top" | "right" | "bottom" | "left",
  mesialIsRight: boolean,
): ToothSurface {
  if (side === "top") return "buccal";
  if (side === "bottom") return "palatal";
  if (side === "right") return mesialIsRight ? "mesial" : "distal";
  return mesialIsRight ? "distal" : "mesial";
}

function strokeFor(condition: ToothConditionDef | undefined, selected: boolean) {
  const bad = condition ? conditionStrokeColor(condition) : null;
  if (bad) return { stroke: bad, strokeWidth: BAD_STROKE_WIDTH };
  if (selected) return { stroke: "#0d9488", strokeWidth: 2 };
  return { stroke: NEUTRAL_STROKE, strokeWidth: 1 };
}

export type ToothComponentProps = {
  number: FdiToothNumber;
  state: OdontogramToothState;
  editable?: boolean;
  selected?: boolean;
  onPressTooth?: (number: FdiToothNumber) => void;
  onLongPressTooth?: (number: FdiToothNumber) => void;
};

/**
 * Diente FDI en 3 capas: raíz (endodoncia, perno, implante, póntico), corona
 * (corona protésica, fractura, extracción indicada, provisional) y anillo de
 * superficies (caries y restauraciones por superficie + oclusal al centro).
 * Un único Pressable cubre todo el diente — qué se aplica al tocarlo lo
 * decide el padre según la condición y superficie activas, no la posición
 * exacta del toque. La orientación vertical se espeja según la arcada.
 */
export function ToothComponent({
  number,
  state,
  editable = false,
  selected = false,
  onPressTooth,
  onLongPressTooth,
}: ToothComponentProps) {
  const quadrant = number[0] as "1" | "2" | "3" | "4";
  const arch: "upper" | "lower" = quadrant === "1" || quadrant === "2" ? "upper" : "lower";
  const mesialIsRight = quadrant === "1" || quadrant === "4";
  const pos = LAYOUT[arch];

  const pieceCondition = state.condition
    ? TOOTH_CONDITIONS_BY_ID[state.condition]
    : undefined;
  const crown = pieceCondition?.layer === "crown" ? pieceCondition : undefined;
  const root = pieceCondition?.layer === "root" ? pieceCondition : undefined;
  const isMissing = state.condition === "missing";

  const surfaceWedges = useMemo(() => {
    const sides: Array<"top" | "right" | "bottom" | "left"> = [
      "top",
      "right",
      "bottom",
      "left",
    ];
    return sides.map((side) => {
      const surface = ringSurfaceForSide(side, mesialIsRight);
      const condId = state.surfaces[surface];
      const condition = condId ? TOOTH_CONDITIONS_BY_ID[condId] : undefined;
      const [start, end] = RING_ANGLES[side];
      return {
        surface,
        condition,
        path: donutWedge(W / 2, pos.ring, RING_OUTER, RING_INNER, start, end),
      };
    });
  }, [mesialIsRight, pos.ring, state.surfaces]);

  const occlusalCondId = state.surfaces.occlusal;
  const occlusalCondition = occlusalCondId
    ? TOOTH_CONDITIONS_BY_ID[occlusalCondId]
    : undefined;

  const label = useMemo(() => {
    const parts = [`Diente ${number}`];
    if (crown) parts.push(crown.label);
    if (root) parts.push(root.label);
    const surfaceLabels = surfaceWedges
      .filter((w) => w.condition)
      .map((w) => `${w.surface}: ${w.condition?.label}`);
    if (occlusalCondition) surfaceLabels.push(`oclusal: ${occlusalCondition.label}`);
    if (surfaceLabels.length) parts.push(surfaceLabels.join(", "));
    return parts.join(", ");
  }, [crown, root, surfaceWedges, occlusalCondition, number]);

  const crownStroke = strokeFor(crown, selected);
  const rootStroke = strokeFor(root, false);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onPressTooth?.(number)}
        onLongPress={() => onLongPressTooth?.(number)}
        disabled={!editable}
        hitSlop={4}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {isMissing ? (
            <>
              <Circle
                cx={W / 2}
                cy={pos.crown}
                r={CROWN_R}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1.2}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <Path
                d={`M${W / 2 - 8} ${pos.crown - 12} L${W / 2 + 8} ${pos.crown + 12} M${W / 2 + 8} ${pos.crown - 12} L${W / 2 - 8} ${pos.crown + 12}`}
                stroke="#ef4444"
                strokeWidth={1.4}
                opacity={0.7}
              />
            </>
          ) : (
            <>
              {/* Raíz */}
              <Path
                d={rootPath(W / 2, pos.root, arch === "upper" ? "up" : "down")}
                fill={root ? conditionFillColor(root) : NEUTRAL_FILL}
                stroke={rootStroke.stroke}
                strokeWidth={rootStroke.strokeWidth}
              />
              {root?.badge ? (
                <SvgText
                  x={W / 2}
                  y={pos.root + 3}
                  fontSize={7}
                  fill="#f8fafc"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {root.badge}
                </SvgText>
              ) : null}

              {/* Corona */}
              <Circle
                cx={W / 2}
                cy={pos.crown}
                r={CROWN_R}
                fill={crown ? conditionFillColor(crown) : NEUTRAL_FILL}
                stroke={crownStroke.stroke}
                strokeWidth={crownStroke.strokeWidth}
              />
              {crown?.badge ? (
                <SvgText
                  x={W / 2}
                  y={pos.crown + 3}
                  fontSize={8}
                  fill="#f8fafc"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {crown.badge}
                </SvgText>
              ) : null}

              {/* Anillo de superficies */}
              {surfaceWedges.map((w) => {
                const s = strokeFor(w.condition, false);
                return (
                  <Path
                    key={w.surface}
                    d={w.path}
                    fill={w.condition ? conditionFillColor(w.condition) : "transparent"}
                    stroke={w.condition ? s.stroke : NEUTRAL_STROKE}
                    strokeWidth={w.condition ? s.strokeWidth : 0.8}
                  />
                );
              })}
              <Circle
                cx={W / 2}
                cy={pos.ring}
                r={RING_INNER - 1}
                fill={
                  occlusalCondition ? conditionFillColor(occlusalCondition) : "transparent"
                }
                stroke={
                  occlusalCondition
                    ? strokeFor(occlusalCondition, false).stroke
                    : NEUTRAL_STROKE
                }
                strokeWidth={occlusalCondition ? strokeFor(occlusalCondition, false).strokeWidth : 0.8}
              />
            </>
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

export const SURFACE_LABEL_ES: Record<ToothSurface, string> = {
  occlusal: "Oclusal-Incisal",
  mesial: "Mesial",
  distal: "Distal",
  buccal: "Vestibular",
  palatal: "Lingual-Palatina",
};

const styles = StyleSheet.create({
  wrap: {
    width: W,
    height: H,
    alignItems: "center",
  },
});
