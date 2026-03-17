import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

interface OnboardingEntryScreenProps {
  onCreateNew: () => void;
  onLoginExisting: () => void;
}

/**
 * Primera pantalla del onboarding:
 * permite elegir entre crear un nuevo negocio o iniciar sesión con uno existente.
 */
export default function OnboardingEntryScreen({
  onCreateNew,
  onLoginExisting,
}: OnboardingEntryScreenProps) {
  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInUp.duration(500)}
        style={styles.headerSection}
      >
        <ThemedText style={styles.wordmark}>SalonPro</ThemedText>
        <ThemedText style={styles.subtitle}>
          Configura tu salón en unos minutos.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(500).delay(150)}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <ThemedText style={styles.title}>
            ¿Cómo quieres empezar hoy?
          </ThemedText>
          <ThemedText style={styles.description}>
            Puedes crear un nuevo negocio desde cero o entrar con una cuenta
            que ya tenga un salón configurado.
          </ThemedText>
        </View>

        <Pressable
          onPress={onCreateNew}
          style={({ pressed }) => [
            styles.primaryOption,
            pressed && styles.optionPressed,
          ]}
        >
          <View style={styles.optionIcon}>
            <Feather name="star" size={18} color="#000000" />
          </View>
          <View style={styles.optionText}>
            <ThemedText style={styles.optionTitle}>
              Crear nuevo negocio
            </ThemedText>
            <ThemedText style={styles.optionSubtitle}>
              Te guiamos paso a paso con tipo de negocio, nombre, equipo y
              servicios.
            </ThemedText>
          </View>
        </Pressable>

        <Pressable
          onPress={onLoginExisting}
          style={({ pressed }) => [
            styles.secondaryOption,
            pressed && styles.optionPressed,
          ]}
        >
          <View style={styles.optionIconSecondary}>
            <Feather name="log-in" size={18} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.optionText}>
            <ThemedText style={styles.optionSecondaryTitle}>
              Ya tengo cuenta
            </ThemedText>
            <ThemedText style={styles.optionSecondarySubtitle}>
              Entra a un salón que ya creaste antes.
            </ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111318",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  wordmark: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  card: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardHeader: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  primaryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  secondaryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  optionPressed: {
    opacity: 0.9,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  optionIconSecondary: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    marginBottom: Spacing.xs,
  },
  optionSubtitle: {
    fontSize: 13,
    color: "rgba(0,0,0,0.7)",
  },
  optionSecondaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  optionSecondarySubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
});

