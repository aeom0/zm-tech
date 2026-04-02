import React from "react";
import { Pressable, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Gradients } from "@/constants/theme";

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={styles.statusFilterContainer}
      keyboardShouldPersistTaps="handled"
    >
      {OPTIONS.map((opt) => {
        const isActive = statusFilter === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              onChange(opt.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.statusChip,
              !isActive && {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
              isActive && { borderColor: "transparent", overflow: "hidden" },
            ]}
          >
            {isActive ? (
              <LinearGradient
                colors={Gradients.onboarding.colors}
                start={Gradients.onboarding.linearStart}
                end={Gradients.onboarding.linearEnd}
                locations={[...Gradients.onboarding.locations]}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            <ThemedText
              style={[
                styles.statusChipText,
                { color: isActive ? "#FFFFFF" : theme.text, zIndex: 1 },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
