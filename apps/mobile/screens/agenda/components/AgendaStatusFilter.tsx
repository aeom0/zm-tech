import React from "react";
import { View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";

import type { AgendaStatusFilter as StatusFilter } from "../types";
import { agendaStyles as styles } from "../agendaStyles";

const OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "scheduled", label: "Pendientes" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" },
];

interface AgendaStatusFilterProps {
  statusFilter: StatusFilter;
  onChange: (v: StatusFilter) => void;
  theme: {
    primary: string;
    backgroundSecondary: string;
    border: string;
    text: string;
  };
}

export function AgendaStatusFilter({
  statusFilter,
  onChange,
  theme,
}: AgendaStatusFilterProps) {
  return (
    <View style={styles.statusFilterContainer}>
      {OPTIONS.map((opt) => {
        const isActive = statusFilter === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={[
              styles.statusChip,
              {
                backgroundColor: isActive
                  ? theme.primary
                  : theme.backgroundSecondary,
                borderColor: isActive ? theme.primary : theme.border,
              },
            ]}
            onPress={() => {
              onChange(opt.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <ThemedText
              style={[
                styles.statusChipText,
                { color: isActive ? "#FFFFFF" : theme.text },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
