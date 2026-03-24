import React, { useState } from "react";
import { View, StyleSheet, Alert, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

interface OnboardingCompleteScreenProps {
  onFinish: () => void;
}

interface StatItem {
  label: string;
  value: string;
}

export default function OnboardingCompleteScreen({
  onFinish,
}: OnboardingCompleteScreenProps) {
  const { config, markConfigured } = useTenant();
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      const result = await markConfigured();
      if (!result.ok) {
        Alert.alert(
          "No pudimos guardar tu configuración",
          result.error ?? "Inténtalo de nuevo en un momento.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Reintentar",
              onPress: () => {
                void handleFinish();
              },
            },
          ],
        );
        return;
      }

      onFinish();
    } finally {
      setSaving(false);
    }
  };

  const miembrosEquipo = 1;

  const stats: StatItem[] = [
    { value: "0", label: "Servicios configurados" },
    { value: String(miembrosEquipo), label: "Miembros del equipo" },
    { value: "Free", label: "Plan activo" },
    { value: "14", label: "Días de trial" },
  ];

  return (
    <OnboardingLayout centered>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.topBlock}>
        <OnboardingProgressDots currentStep={6} />
        <View style={styles.iconCheck}>
          <Feather name="check" size={26} color="rgba(255,255,255,0.9)" />
        </View>
        <ThemedText style={styles.titulo}>¡Todo listo!</ThemedText>
        <ThemedText style={styles.nombre}>{config.businessName}</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Tu app está configurada y lista para empezar a registrar{" "}
          {config.terminology.appointment}s, {config.terminology.staff} y
          servicios.
        </ThemedText>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).duration(400)}>
        <GradientCTAButton
          label="Ir al panel principal"
          icon="arrow-right"
          onPress={handleFinish}
          loading={saving}
          style={styles.cta}
        />
      </Animated.View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  topBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },
  iconCheck: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  nombre: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  subtitulo: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
    width: "100%",
    justifyContent: "center",
  },
  statTile: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 20,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    textAlign: "center",
  },
  cta: {
    width: "100%",
  },
});
