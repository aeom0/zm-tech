import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import {
  FDI_TEETH,
  type FdiToothNumber,
  type OdontogramState,
  type OdontogramToothState,
  type ToothStatus,
  type ToothSurface,
  type SurfaceStatus,
} from "@odentalpro/dental-schema";

import { ToothComponent, STATUS_LABEL_ES } from "./ToothComponent";

const UPPER_RIGHT: FdiToothNumber[] = [
  "18",
  "17",
  "16",
  "15",
  "14",
  "13",
  "12",
  "11",
];
const UPPER_LEFT: FdiToothNumber[] = [
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];
const LOWER_LEFT: FdiToothNumber[] = [
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
];
const LOWER_RIGHT: FdiToothNumber[] = [
  "48",
  "47",
  "46",
  "45",
  "44",
  "43",
  "42",
  "41",
];

const TOOTH_STATUSES: ToothStatus[] = [
  "healthy",
  "to-treat",
  "treated",
  "root-canal",
  "crown",
  "implant",
  "extracted",
];

const SURFACE_CYCLE: SurfaceStatus[] = ["healthy", "to-treat", "treated"];

export function createEmptyOdontogram(): OdontogramState {
  const now = new Date().toISOString();
  const state: OdontogramState = {};
  for (const n of FDI_TEETH) {
    state[n] = {
      status: "healthy",
      surfaces: {},
      lastUpdated: now,
    };
  }
  return state;
}

export type OdontogramViewProps = {
  value?: OdontogramState;
  onChange?: (next: OdontogramState) => void;
  /** false = ficha paciente (solo lectura) */
  editable?: boolean;
  title?: string;
};

/**
 * Odontograma completo FDI (32 dientes). Sin persistencia — controlado por props.
 */
export function OdontogramView({
  value,
  onChange,
  editable = false,
  title = "Odontograma",
}: OdontogramViewProps) {
  const [internal, setInternal] = useState<OdontogramState>(
    () => value ?? createEmptyOdontogram(),
  );
  const [selected, setSelected] = useState<FdiToothNumber | null>(null);

  const state = value ?? internal;

  const commit = useCallback(
    (next: OdontogramState) => {
      if (value === undefined) setInternal(next);
      onChange?.(next);
    },
    [onChange, value],
  );

  const patchTooth = useCallback(
    (number: FdiToothNumber, patch: Partial<OdontogramToothState>) => {
      const prev = state[number] ?? {
        status: "healthy" as const,
        surfaces: {},
        lastUpdated: new Date().toISOString(),
      };
      commit({
        ...state,
        [number]: {
          ...prev,
          ...patch,
          surfaces: patch.surfaces ?? prev.surfaces,
          lastUpdated: new Date().toISOString(),
        },
      });
    },
    [commit, state],
  );

  const onPressTooth = useCallback(
    (number: FdiToothNumber) => {
      setSelected(number);
      const current = state[number]?.status ?? "healthy";
      const idx = TOOTH_STATUSES.indexOf(current);
      const nextStatus = TOOTH_STATUSES[(idx + 1) % TOOTH_STATUSES.length];
      patchTooth(number, { status: nextStatus });
    },
    [patchTooth, state],
  );

  const onPressSurface = useCallback(
    (number: FdiToothNumber, surface: ToothSurface) => {
      setSelected(number);
      const current = state[number]?.surfaces[surface] ?? "healthy";
      const idx = SURFACE_CYCLE.indexOf(current);
      const next = SURFACE_CYCLE[(idx + 1) % SURFACE_CYCLE.length];
      const surfaces = {
        ...(state[number]?.surfaces ?? {}),
        [surface]: next,
      };
      patchTooth(number, { surfaces });
    },
    [patchTooth, state],
  );

  const legend = useMemo(
    () =>
      TOOTH_STATUSES.map((s) => (
        <View key={s} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: swatchColor(s) }]} />
          <Text style={styles.legendText}>{STATUS_LABEL_ES[s]}</Text>
        </View>
      )),
    [],
  );

  const renderArch = (teeth: FdiToothNumber[]) => (
    <View style={styles.archRow}>
      {teeth.map((n) => (
        <ToothComponent
          key={n}
          number={n}
          state={
            state[n] ?? {
              status: "healthy",
              surfaces: {},
              lastUpdated: "",
            }
          }
          editable={editable}
          selected={selected === n}
          onPressTooth={onPressTooth}
          onPressSurface={onPressSurface}
        />
      ))}
    </View>
  );

  return (
    <ScrollView
      horizontal={false}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{title}</Text>
      {editable ? (
        <Text style={styles.hint}>
          Toca el diente para ciclar estado · toca una superficie para marcarla
        </Text>
      ) : (
        <Text style={styles.hint}>Solo lectura</Text>
      )}

      <Text style={styles.archLabel}>Superior</Text>
      <View style={styles.archBlock}>
        {renderArch(UPPER_RIGHT)}
        <View style={styles.midline} />
        {renderArch(UPPER_LEFT)}
      </View>

      <Text style={[styles.archLabel, { marginTop: 20 }]}>Inferior</Text>
      <View style={styles.archBlock}>
        {renderArch(LOWER_RIGHT)}
        <View style={styles.midline} />
        {renderArch(LOWER_LEFT)}
      </View>

      <View style={styles.legend}>{legend}</View>

      {editable && selected ? (
        <Pressable
          style={styles.resetBtn}
          onPress={() =>
            patchTooth(selected, { status: "healthy", surfaces: {} })
          }
        >
          <Text style={styles.resetText}>Reset diente {selected}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function swatchColor(status: ToothStatus): string {
  const map: Record<ToothStatus, string> = {
    healthy: "#e2e8f0",
    treated: "#86efac",
    "to-treat": "#fcd34d",
    extracted: "#94a3b8",
    implant: "#a5b4fc",
    crown: "#f9a8d4",
    "root-canal": "#fdba74",
  };
  return map[status];
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: "#f0f4f8",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  hint: {
    color: "#64748b",
    fontSize: 13,
    marginBottom: 16,
  },
  archLabel: {
    color: "#94a3b8",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  archBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 2,
  },
  archRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  midline: {
    width: 8,
    alignSelf: "stretch",
    marginHorizontal: 4,
    backgroundColor: "rgba(13, 148, 136, 0.35)",
    borderRadius: 2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 24,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#334155",
  },
  legendText: {
    color: "#94a3b8",
    fontSize: 11,
  },
  resetBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1a2332",
  },
  resetText: {
    color: "#2dd4bf",
    fontSize: 13,
  },
});
