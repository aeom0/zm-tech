import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useThemePreference, ThemePreference } from "@/contexts/ThemeContext";

const OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "Claro", value: "light" },
  { label: "Auto", value: "auto" },
  { label: "Oscuro", value: "dark" },
];

export function ThemeRow() {
  const { preference, setPreference } = useThemePreference();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: theme.text }]}>
        Apariencia
      </ThemedText>
      <ThemedText
        type="small"
        style={[styles.subtitle, { color: theme.textMuted }]}
      >
        Elige cómo se ve la app en este dispositivo.
      </ThemedText>
      <View
        style={[
          styles.segmented,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: theme.border,
          },
        ]}
      >
        {OPTIONS.map((option) => {
          const isActive = option.value === preference;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [
                styles.segment,
                {
                  backgroundColor: isActive ? theme.primary : "transparent",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.segmentLabel,
                  {
                    color: isActive ? "#FFFFFF" : theme.textSecondary,
                  },
                ]}
              >
                {option.label}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: Spacing.md,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
