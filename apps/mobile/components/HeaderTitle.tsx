import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Gradients, Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { useTheme } from "@/hooks/useTheme";

interface HeaderTitleProps {
  title: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  const { config } = useTenant();
  const { theme } = useTheme();

  const isBrandTitle = title === "SalonPro";

  if (isBrandTitle) {
    return (
      <View style={[styles.container, styles.brandContainer]}>
        <View style={styles.wordmarkRow}>
          <Text style={[styles.wordmarkSalon, { color: theme.text }]}>Salon</Text>
          <MaskedView
            style={styles.maskedPro}
            maskElement={
              <View style={styles.maskCenter}>
                <Text style={styles.wordmarkProMask}>Pro</Text>
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
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconFallback,
          { backgroundColor: `${config.theme.primaryColor}18` },
        ]}
      >
        <ThemedText
          style={[styles.iconLetter, { color: config.theme.primaryColor }]}
        >
          {config.businessName.slice(0, 1).toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  brandContainer: {
    justifyContent: "center",
    flex: 1,
  },
  iconFallback: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  iconLetter: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmarkSalon: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    // color se pasa como prop inline desde { color: theme.text }
    // para respetar light/dark mode sin romper MaskedView
  },
  maskedPro: {
    height: 26,
  },
  maskCenter: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  wordmarkProMask: {
    fontSize: 18,
    fontWeight: "700",
    color: "black",
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  gradientFill: {
    flex: 1,
    width: 60,
  },
});
