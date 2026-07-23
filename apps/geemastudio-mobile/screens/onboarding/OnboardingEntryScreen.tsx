import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  GradientCTAButton,
  DiamondHero,
} from "@/screens/onboarding/components";
import { Gradients, Spacing } from "@/constants/theme";

interface OnboardingEntryScreenProps {
  onCreateNew: () => void;
  onLoginExisting: () => void;
}

export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <OnboardingLayout centered>
      {/* Diamante + glow + GeemaStudio + tagline */}
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

        {/* "con estilo y precisión" — gradiente dentro de las letras */}
        <MaskedView
          style={styles.maskedHighlight}
          maskElement={
            <View style={styles.maskLeft}>
              <Text style={styles.heroHighlightMask}>
                con estilo y precisión
              </Text>
            </View>
          }
        >
          <LinearGradient
            colors={[...Gradients.onboarding.colors]}
            locations={[...Gradients.onboarding.locations]}
            start={Gradients.onboarding.linearStart}
            end={Gradients.onboarding.linearEnd}
            style={styles.gradientFill}
          />
        </MaskedView>

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
    fontSize: 38,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 46,
  },
  // Altura generosa para que "precisión" con su descendente no se corte
  maskedHighlight: {
    height: 58,
    marginTop: 2,
  },
  maskLeft: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  heroHighlightMask: {
    fontSize: 38,
    fontWeight: "300",
    letterSpacing: 0.5,
    lineHeight: 54,
    color: "black",
  },
  gradientFill: {
    flex: 1,
    width: 400,
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
