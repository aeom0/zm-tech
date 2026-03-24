import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";

interface OnboardingEntryScreenProps {
  onCreateNew: () => void;
  onLoginExisting: () => void;
}

/**
 * Entrada al onboarding: fondo sólido #111318, CTAs Lunaris.
 */
export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <OnboardingLayout centered>
      <Animated.View
        entering={FadeInUp.duration(500)}
        style={styles.topSection}
      >
        <ThemedText style={styles.wordmark}>SalonPro</ThemedText>
        <ThemedText style={styles.tagline}>
          Configura tu salón en unos minutos.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(500).delay(120)}
        style={styles.bottomSection}
      >
        <GradientCTAButton
          label="Crear nuevo negocio"
          onPress={onCreateNew}
          icon="star"
          style={styles.btnFull}
        />
        <GradientCTAButton
          variant="outline"
          label="Ya tengo cuenta"
          onPress={onLoginExisting}
          style={styles.btnFull}
        />
      </Animated.View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wordmark: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
    marginTop: 0,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  bottomSection: {
    gap: 12,
    width: "100%",
  },
  btnFull: {
    width: "100%",
  },
});
