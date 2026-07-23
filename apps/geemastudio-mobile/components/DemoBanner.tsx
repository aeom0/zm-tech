import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { useTenant } from "@/contexts/TenantContext";

/**
 * Barra informativa visible solo en modo demo.
 * Debajo del área de tabs (MainTabNavigator).
 */
export function DemoBanner() {
  const { config } = useTenant();
  if (!config.isDemo) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Modo demo · Los cambios se restablecen al cerrar sesión
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#E91E8C22",
    borderBottomWidth: 1,
    borderBottomColor: "#E91E8C55",
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#E91E8C",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
