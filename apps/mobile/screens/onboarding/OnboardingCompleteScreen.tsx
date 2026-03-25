import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

const GRADIENT_COLORS = ["#E91E8C", "#9C27B0", "#3D3D8F", "#1565C0"] as const;

interface OnboardingCompleteScreenProps {
  onFinish: () => void;
}

interface StatItem {
  label: string;
  value: string;
}

const FEATURES = [
  { icon: "calendar" as const, text: "Agenda y citas en tiempo real" },
  { icon: "trending-up" as const, text: "Finanzas y reportes detallados" },
  { icon: "users" as const, text: "Gestión de equipo y comisiones" },
];

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

  const stats: StatItem[] = [
    { value: "3", label: "Categorías" },
    { value: "1", label: "Profesional" },
    { value: "—", label: "Citas hoy" },
  ];

  return (
    <OnboardingLayout centered>
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.topBlock}
      >
        <OnboardingProgressDots currentStep={6} />

        {/* Círculo gradiente con check */}
        <LinearGradient
          colors={[...GRADIENT_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkCircle}
        >
          <Feather name="check" size={36} color="#FFFFFF" />
        </LinearGradient>

        <View style={styles.textBlock}>
          <ThemedText style={styles.titulo}>¡Todo listo!</ThemedText>
          <ThemedText style={styles.nombre}>{config.businessName}</ThemedText>
          <ThemedText style={styles.subtitulo}>
            Tu negocio está configurado y listo{"\n"}para recibir clientes
          </ThemedText>
        </View>

        {/* Stat tiles horizontales */}
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            </View>
          ))}
        </View>

        {/* Lista de features */}
        <View style={styles.featuresList}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIconBg}>
                <Feather name={f.icon} size={15} color="#E91E8C" />
              </View>
              <ThemedText style={styles.featureText}>{f.text}</ThemedText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(280).duration(400)}
        style={styles.ctaWrap}
      >
        <GradientCTAButton
          label="Ir al panel principal"
          icon="grid"
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
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing["2xl"],
  },
  textBlock: {
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing["2xl"],
  },
  titulo: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  nombre: {
    fontSize: 17,
    fontWeight: "700",
    color: "#E91E8C",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  subtitulo: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
    marginTop: Spacing.sm,
    maxWidth: "80%",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
    width: "100%",
    justifyContent: "center",
  },
  statTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 6,
    textAlign: "center",
  },
  featuresList: {
    width: "100%",
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(233,30,140,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  ctaWrap: {
    marginTop: Spacing["3xl"],
  },
  cta: {
    width: "100%",
  },
});
