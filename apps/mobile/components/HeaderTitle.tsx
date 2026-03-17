import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  const { config } = useTenant();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconFallback,
          { backgroundColor: `${config.theme.primaryColor}18` },
        ]}
      >
        <ThemedText
          style={[styles.iconLetter, { color: config.theme.primaryColor }]}
        >
          {config.businessName.slice(0, 1).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  iconFallback: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  iconLetter: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
});
