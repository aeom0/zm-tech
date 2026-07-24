import React, { useCallback, useMemo } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path, Rect, G } from "react-native-svg";
import type {
  FdiToothNumber,
  OdontogramToothState,
  SurfaceStatus,
  ToothStatus,
  ToothSurface,
} from "@odentalpro/dental-schema";

const TOOTH_W = 36;
const TOOTH_H = 48;

const STATUS_FILL: Record<ToothStatus, string> = {
  healthy: "#e2e8f0",
  treated: "#86efac",
  "to-treat": "#fcd34d",
  extracted: "#94a3b8",
  implant: "#a5b4fc",
  crown: "#f9a8d4",
  "root-canal": "#fdba74",
};

const SURFACE_FILL: Record<SurfaceStatus, string> = {
  healthy: "transparent",
  treated: "#22c55e",
  "to-treat": "#eab308",
};

export const STATUS_LABEL_ES: Record<ToothStatus, string> = {
  healthy: "Sano",
  treated: "Tratado",
  "to-treat": "Por tratar",
  extracted: "Ausente",
  implant: "Implante",
  crown: "Corona",
  "root-canal": "Endodoncia",
};

export const SURFACE_LABEL_ES: Record<ToothSurface, string> = {
  occlusal: "Oclusal",
  mesial: "Mesial",
  distal: "Distal",
  buccal: "Vestibular",
  palatal: "Palatino/Lingual",
};

// Patrón "diamante" clínico estándar: cuadrado exterior (6,10)-(30,34) con
// centro C(18,22). Las diagonales de las 4 esquinas hacia C forman los
// triángulos vestibular/palatino/mesial/distal; el cuadrado interior
// (oclusal) se dibuja al final para que quede por encima, tapando la punta
// de los triángulos en el centro.
const DIAMOND = {
  TL: { x: 6, y: 10 },
  TR: { x: 30, y: 10 },
  BR: { x: 30, y: 34 },
  BL: { x: 6, y: 34 },
  C: { x: 18, y: 22 },
} as const;

const OCCLUSAL_RECT = { x1: 12, y1: 16, x2: 24, y2: 28 } as const;

const SURFACE_PATH: Record<ToothSurface, string> = {
  buccal: `M${DIAMOND.TL.x} ${DIAMOND.TL.y} L${DIAMOND.TR.x} ${DIAMOND.TR.y} L${DIAMOND.C.x} ${DIAMOND.C.y} Z`,
  distal: `M${DIAMOND.TR.x} ${DIAMOND.TR.y} L${DIAMOND.BR.x} ${DIAMOND.BR.y} L${DIAMOND.C.x} ${DIAMOND.C.y} Z`,
  palatal: `M${DIAMOND.BR.x} ${DIAMOND.BR.y} L${DIAMOND.BL.x} ${DIAMOND.BL.y} L${DIAMOND.C.x} ${DIAMOND.C.y} Z`,
  mesial: `M${DIAMOND.BL.x} ${DIAMOND.BL.y} L${DIAMOND.TL.x} ${DIAMOND.TL.y} L${DIAMOND.C.x} ${DIAMOND.C.y} Z`,
  occlusal: `M${OCCLUSAL_RECT.x1} ${OCCLUSAL_RECT.y1} H${OCCLUSAL_RECT.x2} V${OCCLUSAL_RECT.y2} H${OCCLUSAL_RECT.x1} Z`,
};

const SURFACE_TRIANGLE: Record<
  "buccal" | "distal" | "palatal" | "mesial",
  [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]
> = {
  buccal: [DIAMOND.TL, DIAMOND.TR, DIAMOND.C],
  distal: [DIAMOND.TR, DIAMOND.BR, DIAMOND.C],
  palatal: [DIAMOND.BR, DIAMOND.BL, DIAMOND.C],
  mesial: [DIAMOND.BL, DIAMOND.TL, DIAMOND.C],
};

function sign(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function pointInTriangle(
  pt: { x: number; y: number },
  v1: { x: number; y: number },
  v2: { x: number; y: number },
  v3: { x: number; y: number },
) {
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pointInOcclusal(pt: { x: number; y: number }) {
  return (
    pt.x >= OCCLUSAL_RECT.x1 &&
    pt.x <= OCCLUSAL_RECT.x2 &&
    pt.y >= OCCLUSAL_RECT.y1 &&
    pt.y <= OCCLUSAL_RECT.y2
  );
}

/** Superficie tocada dentro del viewBox del diente, o null si cayó fuera del diamante (borde/raíz del diente). */
function hitTestSurface(pt: { x: number; y: number }): ToothSurface | null {
  if (pointInOcclusal(pt)) return "occlusal";
  for (const surface of Object.keys(SURFACE_TRIANGLE) as Array<
    keyof typeof SURFACE_TRIANGLE
  >) {
    const [v1, v2, v3] = SURFACE_TRIANGLE[surface];
    if (pointInTriangle(pt, v1, v2, v3)) return surface;
  }
  return null;
}

export type ToothComponentProps = {
  number: FdiToothNumber;
  state: OdontogramToothState;
  editable?: boolean;
  selected?: boolean;
  onPressTooth?: (number: FdiToothNumber) => void;
  onPressSurface?: (number: FdiToothNumber, surface: ToothSurface) => void;
};

/**
 * Diente FDI con 5 superficies independientes (patrón diamante clínico:
 * oclusal al centro + vestibular/distal/palatino/mesial como triángulos).
 * El hit-testing se resuelve por coordenadas en un único Pressable en vez de
 * onPress por <Path>: en react-native-svg el onPress por shape es poco
 * fiable en web (y se rompe si además hay un Pressable padre — eventos
 * anidados). SVG puro vía react-native-svg (compatible web/mobile).
 */
export function ToothComponent({
  number,
  state,
  editable = false,
  selected = false,
  onPressTooth,
  onPressSurface,
}: ToothComponentProps) {
  const isExtracted = state.status === "extracted";
  const bodyFill = STATUS_FILL[state.status];

  const surfacePath = useMemo(() => SURFACE_PATH, []);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!editable) return;
      // En nativo, GestureResponderEvent trae locationX/locationY relativas al
      // elemento. En react-native-web esos campos vienen undefined — el
      // evento ahí es prácticamente el MouseEvent del DOM, así que usamos
      // offsetX/offsetY (relativas al <svg>, que coinciden con el viewBox).
      const native = event.nativeEvent as GestureResponderEvent["nativeEvent"] &
        Partial<{ offsetX: number; offsetY: number }>;
      const x = native.locationX ?? native.offsetX ?? 0;
      const y = native.locationY ?? native.offsetY ?? 0;
      const surface = isExtracted ? null : hitTestSurface({ x, y });
      if (surface) {
        onPressSurface?.(number, surface);
      } else {
        onPressTooth?.(number);
      }
    },
    [editable, isExtracted, number, onPressSurface, onPressTooth],
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Diente ${number}, estado ${STATUS_LABEL_ES[state.status]}`}
        onPress={handlePress}
        disabled={!editable}
      >
        <Svg width={TOOTH_W} height={TOOTH_H} viewBox="0 0 36 48">
          <Path
            d="M8 6 Q18 2 28 6 L30 38 Q18 46 6 38 Z"
            fill={bodyFill}
            stroke={selected ? "#0d9488" : "#334155"}
            strokeWidth={selected ? 2.2 : 1.2}
          />

          {!isExtracted &&
            (Object.keys(surfacePath) as ToothSurface[]).map((surface) => {
              const status = state.surfaces[surface] ?? "healthy";
              return (
                <G key={surface}>
                  <Path
                    d={surfacePath[surface]}
                    fill={SURFACE_FILL[status]}
                    stroke="#64748b"
                    strokeWidth={0.8}
                    opacity={status === "healthy" ? 0.35 : 0.9}
                  />
                </G>
              );
            })}

          {state.status === "implant" && (
            <Rect x={15} y={18} width={6} height={16} rx={1} fill="#4338ca" />
          )}
          {state.status === "crown" && (
            <Path
              d="M10 8 Q18 4 26 8 L26 14 Q18 12 10 14 Z"
              fill="#db2777"
              opacity={0.85}
            />
          )}
        </Svg>
      </Pressable>
      <Text style={styles.label}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: TOOTH_W,
    height: TOOTH_H + 16,
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
});
