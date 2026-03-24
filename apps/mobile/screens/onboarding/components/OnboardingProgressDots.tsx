import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const GRADIENT_COLORS = [
  "#E91E8C",
  "#9C27B0",
  "#3D3D8F",
  "#1565C0",
] as const;

const TOTAL_STEPS = 7;

interface OnboardingProgressDotsProps {
  /** 0–6 (entrada sin dots = no se usa 0 en pantallas con pasos del wizard). */
  currentStep: number;
}

export function OnboardingProgressDots({
  currentStep,
}: OnboardingProgressDotsProps) {
  const safeStep = Math.min(Math.max(currentStep, 0), TOTAL_STEPS - 1);

  return (
    <View style={styles.container}>
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
        const isActive = index === safeStep;
        if (isActive) {
          return (
            <LinearGradient
              key={index}
              colors={[...GRADIENT_COLORS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dotActive}
            />
          );
        }
        return <View key={index} style={styles.dotInactive} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  dotActive: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
});
