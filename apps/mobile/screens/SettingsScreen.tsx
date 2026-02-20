import React from "react";
import { View, StyleSheet } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

const APP_VERSION = "1.0.0";

export default function SettingsScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.row}>
          <Feather name="info" size={20} color={theme.textMuted} />
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Versión
          </ThemedText>
        </View>
        <ThemedText style={[styles.value, { color: theme.text }]}>
          {APP_VERSION}
        </ThemedText>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText style={[styles.aboutTitle, { color: theme.text }]}>
          ZM Lash & Nails Beauty
        </ThemedText>
        <ThemedText style={[styles.aboutText, { color: theme.textSecondary }]}>
          Panel de gestión para el salón. Citas, servicios, inventario y
          finanzas en un solo lugar.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
