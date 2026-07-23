import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

import { Spacing } from "@/constants/theme";

interface AsignarLoadingPlaceholderProps {
  /** Color del spinner (típico: theme.primary) */
  color: string;
}

/**
 * Estado de carga inicial cuando la lista aún no tiene datos.
 */
export function AsignarLoadingPlaceholder({
  color,
}: AsignarLoadingPlaceholderProps) {
  return (
    <View style={styles.loadingBox}>
      <ActivityIndicator color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    paddingTop: Spacing["5xl"],
    alignItems: "center",
    justifyContent: "center",
  },
});
