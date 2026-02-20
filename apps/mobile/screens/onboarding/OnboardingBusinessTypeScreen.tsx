import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import {
  spaNavilsPreset,
  barbershopPreset,
  hairSalonPreset,
  fullAestheticPreset,
  type TenantConfig,
} from "@salonpro/tenant-config";

type BusinessType = TenantConfig["businessType"];

interface OnboardingBusinessTypeScreenProps {
  onNext: () => void;
}

const TIPOS = [
  {
    key: "spa-nails" as BusinessType,
    emoji: "💅",
    nombre: "Spa / Uñas",
    descripcion: "Uñas, pestañas, cejas y tratamientos de belleza",
    preset: spaNavilsPreset,
  },
  {
    key: "barbershop" as BusinessType,
    emoji: "✂️",
    nombre: "Barbería",
    descripcion: "Cortes, afeitado, arreglo de barba y bigote",
    preset: barbershopPreset,
  },
  {
    key: "hair-salon" as BusinessType,
    emoji: "💇",
    nombre: "Peluquería",
    descripcion: "Cortes, color, peinados y tratamientos capilares",
    preset: hairSalonPreset,
  },
  {
    key: "full-aesthetic" as BusinessType,
    emoji: "🌿",
    nombre: "Estética Integral",
    descripcion: "Servicios de belleza y bienestar completos",
    preset: fullAestheticPreset,
  },
];

export default function OnboardingBusinessTypeScreen({
  onNext,
}: OnboardingBusinessTypeScreenProps) {
  const { config, updateTenant } = useTenant();

  const seleccionar = async (tipo: (typeof TIPOS)[0]) => {
    await updateTenant({
      businessType: tipo.key,
      theme: tipo.preset.theme,
      terminology: tipo.preset.terminology,
      businessHours: tipo.preset.businessHours,
      commissions: tipo.preset.commissions,
    });
    onNext();
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.paso}>Paso 1 de 4</ThemedText>
        <ThemedText style={styles.titulo}>
          ¿Qué tipo de negocio tienes?
        </ThemedText>
        <ThemedText style={styles.subtitulo}>
          Configuraremos la app con las opciones ideales para tu negocio.
        </ThemedText>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.cards}
        showsVerticalScrollIndicator={false}
      >
        {TIPOS.map((tipo, i) => {
          const seleccionado = config.businessType === tipo.key;
          return (
            <Animated.View
              key={tipo.key}
              entering={FadeInDown.delay(i * 80).duration(400)}
            >
              <Pressable
                onPress={() => seleccionar(tipo)}
                style={({ pressed }) => [
                  styles.card,
                  seleccionado && styles.cardSeleccionado,
                  pressed && styles.cardPressed,
                ]}
              >
                <ThemedText style={styles.emoji}>{tipo.emoji}</ThemedText>
                <View style={styles.cardTexto}>
                  <ThemedText style={styles.cardNombre}>
                    {tipo.nombre}
                  </ThemedText>
                  <ThemedText style={styles.cardDesc}>
                    {tipo.descripcion}
                  </ThemedText>
                </View>
                {seleccionado && (
                  <View style={styles.check}>
                    <ThemedText style={styles.checkMark}>✓</ThemedText>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing.xl,
  },
  paso: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitulo: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  cards: {
    gap: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardSeleccionado: {
    borderColor: Colors.light.violet,
    backgroundColor: Colors.light.primaryLight,
  },
  cardPressed: {
    opacity: 0.85,
  },
  emoji: {
    fontSize: 36,
  },
  cardTexto: {
    flex: 1,
  },
  cardNombre: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.violet,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: Colors.light.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
