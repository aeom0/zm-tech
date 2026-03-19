import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GradientButton } from "@/components/GradientButton";
import { GradientProgressDots } from "@/components/GradientProgressDots";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

interface OnboardingCompleteScreenProps {
  onFinish: () => void;
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

  const categoriasPorTipo: Record<string, number> = {
    "spa-nails": 4,
    barbershop: 4,
    "hair-salon": 4,
    "full-aesthetic": 5,
  };

  const categoriasCount = categoriasPorTipo[config.businessType] ?? 0;
  const especialistasCount = 1;
  const serviciosCount = 0;

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <GradientProgressDots total={5} current={4} />
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
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={styles.statsGrid}
      >
        <View style={styles.statTile}>
          <ThemedText style={styles.statNumber}>{categoriasCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Categorías</ThemedText>
        </View>
        <View style={styles.statTile}>
          <ThemedText style={styles.statNumber}>{serviciosCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Servicios</ThemedText>
        </View>
        <View style={styles.statTile}>
          <ThemedText style={styles.statNumber}>
            {especialistasCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>
            {config.terminology.staffSingular.toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.statTile}>
          <ThemedText style={styles.statNumber}>—</ThemedText>
          <ThemedText style={styles.statLabel}>Citas hoy</ThemedText>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={styles.footer}
      >
        <GradientButton
          label="Ir al panel"
          onPress={handleFinish}
          loading={saving}
          showArrow={false}
        />
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
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
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
  },
  subtitulo: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  statTile: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  footer: {
    marginTop: Spacing.md,
  },
});
