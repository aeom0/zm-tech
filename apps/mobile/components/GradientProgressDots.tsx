import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gradients } from "@/constants/theme";

interface GradientProgressDotsProps {
  total: number;
  current: number; // 0-indexed
}

export function GradientProgressDots({
  total,
  current,
}: GradientProgressDotsProps) {
  const g = Gradients.onboarding;

  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        return isActive ? (
          <LinearGradient
            key={i}
            colors={g.colors}
            locations={g.locations}
            start={g.linearStart}
            end={g.linearEnd}
            style={styles.dotActive}
          />
        ) : (
          <View key={i} style={styles.dotInactive} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dotActive: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  dotInactive: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});
