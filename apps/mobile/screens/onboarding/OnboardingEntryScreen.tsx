import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  GradientCTAButton,
  DiamondHero,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";

interface OnboardingEntryScreenProps {
  onCreateNew: () => void;
  onLoginExisting: () => void;
}

const GRADIENT: [string, string, string] = ["#E91E8C", "#9C27B0", "#1565C0"];

export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <OnboardingLayout centered>
      {/* Diamante + glow + SalonPro + tagline */}
      <Animated.View
        entering={FadeInUp.duration(500)}
        style={styles.logoSection}
      >
        <DiamondHero />
      </Animated.View>

      {/* Hero text */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(80)}
        style={styles.heroSection}
      >
        <ThemedText style={styles.heroTitle}>Gestiona tu estudio</ThemedText>

        {/* "con estilo y precisión" — fondo gradiente + texto blanco encima */}
        <View style={styles.highlightContainer}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.heroHighlight}>con estilo y precisión</Text>
        </View>

        <ThemedText style={styles.heroSub}>
          Citas, personal, finanzas e inventario{"\n"}todo en tu bolsillo.
        </ThemedText>
      </Animated.View>

      {/* Botones */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(160)}
        style={styles.bottomSection}
      >
        <GradientCTAButton
          label="Crear nuevo negocio"
          onPress={onCreateNew}
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
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  heroSection: {
    alignItems: "flex-start",
    paddingBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 48,
  },
  highlightContainer: {
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 2,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  heroHighlight: {
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 48,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 20,
    marginTop: Spacing.lg,
  },
  bottomSection: {
    gap: 12,
    width: "100%",
  },
  btnFull: {
    width: "100%",
  },
});
