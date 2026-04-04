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

  const containerStyle = {
    flex: 1,
    backgroundColor: Onboarding.canvasBackground,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
  };

  if (scrollable) {
    return (
      <KeyboardAvoidingView
        style={styles.flexRoot}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[containerStyle, styles.scrollGrow]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
  scrollGrow: {
    flexGrow: 1,
  },
  centered: {
    justifyContent: "space-between",
  },
});
