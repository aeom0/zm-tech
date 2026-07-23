import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import { inventoryStyles as styles } from "../inventoryStyles";

interface InventoryAccessDeniedProps {
  theme: {
    backgroundRoot: string;
    text: string;
    textSecondary: string;
    textMuted: string;
  };
}

export function InventoryAccessDenied({ theme }: InventoryAccessDeniedProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.accessDeniedContainer}>
        <Feather
          name="lock"
          size={32}
          color={theme.textMuted}
          style={{ marginBottom: Spacing.md }}
        />
        <ThemedText
          style={{ fontSize: 16, textAlign: "center", color: theme.text }}
        >
          El inventario solo se maneja desde administración.
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 13,
            textAlign: "center",
            marginTop: Spacing.sm,
            color: theme.textSecondary,
          }}
        >
          Cualquier ajuste de productos o insumos se coordina con la dueña.
        </ThemedText>
      </View>
    </View>
  );
}
