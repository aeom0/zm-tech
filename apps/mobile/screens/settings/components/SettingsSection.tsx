import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { SettingsSectionProps } from "../types";

export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText
        style={[styles.title, { color: theme.textSecondary }]}
      >
        {title}
      </ThemedText>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        {children}
      </View>
      {footer ? (
        <ThemedText
          type="small"
          style={[styles.footer, { color: theme.textMuted }]}
        >
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  footer: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
});

