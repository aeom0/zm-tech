import React from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Onboarding, Spacing } from "@/constants/theme";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
  /** Entry y Complete: reparte espacio vertical (space-between). */
  centered?: boolean;
}

/**
 * Contenedor único del onboarding: SafeArea + fondo fijo (no depende del tenant).
 */
export function OnboardingLayout({
  children,
  scrollable = false,
  centered = false,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();

  const paddingCanvas = {
    backgroundColor: Onboarding.canvasBackground,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
  };

  /** Vista fija: ocupa toda la pantalla. */
  const containerStyle = [paddingCanvas, styles.fill];

  if (scrollable) {
    // NUNCA poner flex:1 en contentContainerStyle del ScrollView: impide scroll cuando el
    // contenido es más alto que la pantalla (el contenedor se “pega” a la ventana).
    return (
      <KeyboardAvoidingView
        style={styles.flexRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flexRoot}
          contentContainerStyle={[paddingCanvas, styles.scrollContentGrow]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[containerStyle, centered && styles.centered]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flexRoot: {
    flex: 1,
    backgroundColor: Onboarding.canvasBackground,
  },
  fill: {
    flex: 1,
  },
  /** Solo flexGrow en el contenido scrollable: rellena si hay poco contenido, pero deja crecer si hay mucho. */
  scrollContentGrow: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: "space-between",
  },
});
