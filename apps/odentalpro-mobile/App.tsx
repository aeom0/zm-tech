import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/**
 * Shell mínimo Fase 0 — pantallas clínicas se agregan desde Fase 2.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="light" />
          <View style={styles.content}>
            <Text style={styles.eyebrow}>ZM Tech</Text>
            <Text style={styles.title}>OdentalPro</Text>
            <Text style={styles.subtitle}>
              Scaffold móvil listo. Odontograma e historia clínica vienen en las
              siguientes fases.
            </Text>
            <Text style={styles.meta}>Expo SDK 56 · Fase 0</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    backgroundColor: "#0a0f14",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: "#2dd4bf",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#f0f4f8",
    fontSize: 36,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 340,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 28,
  },
});
