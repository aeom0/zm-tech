import React from "react";
import { View, StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ClientSegment } from "../types";

interface Props {
  segment: ClientSegment;
  onSegmentChange: (segment: ClientSegment) => void;
}

const SEGMENTS: { id: ClientSegment; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "vip", label: "VIP" },
  { id: "regular", label: "Regulares" },
  { id: "at_risk", label: "En riesgo" },
  { id: "new", label: "Nuevos" },
];

export function ClientFilterBar({ segment, onSegmentChange }: Props) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.scrollRow}>
        {SEGMENTS.map((seg) => {
          const isActive = segment === seg.id;
          return (
            <Pressable
              key={seg.id}
              style={[
                styles.chip,
                {
                  borderColor: isActive ? theme.primary : theme.border,
                  backgroundColor: isActive
                    ? theme.primary
                    : theme.backgroundSecondary,
                },
              ]}
              onPress={() => onSegmentChange(seg.id)}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: isActive ? "#FFFFFF" : theme.text },
                ]}
              >
                {seg.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
