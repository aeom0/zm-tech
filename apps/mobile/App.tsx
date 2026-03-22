import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useNotifications } from "@/hooks/useNotifications";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/** Tiempo máximo de espera para cargar la fuente de iconos (evita "6000ms timeout" en web) */
const FONT_LOAD_TIMEOUT_MS = 12_000;

/**
 * Precarga la fuente Feather (usada por @expo/vector-icons) con timeout y catch
 * para que no quede la app atascada en "bundling 100%" por timeout de expo-font.
 */
function useIconFontReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadPromise: Promise<void>;
    try {
      const fontAsset = require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf");
      loadPromise = Font.loadAsync(fontAsset);
    } catch {
      loadPromise = Promise.resolve();
    }
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("font_timeout")), FONT_LOAD_TIMEOUT_MS),
    );
    Promise.race([loadPromise, timeoutPromise])
      .catch(() => {
        // Timeout o error: seguimos igual para no bloquear la app
      })
      .then(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

function AppContent() {
  const { userId } = useAuth();
  useNotifications(userId);
  const fontReady = useIconFontReady();

  // Mientras la fuente carga, no renderizamos nada (el splash nativo ya está visible)
  if (!fontReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardProvider>
          <NavigationContainer>
            <RootStackNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </QueryClientProvider>
        </ThemeProvider>
      </TenantProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
