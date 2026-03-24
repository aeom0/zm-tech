import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";
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

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (full.length !== 6) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const TIPOS = [
  {
    key: "spa-nails" as BusinessType,
    icon: "droplet" as const,
    nombre: "Spa / Uñas",
    descripcion: "Uñas, pestañas, cejas y tratamientos de belleza",
    preset: spaNavilsPreset,
  },
  {
    key: "barbershop" as BusinessType,
    icon: "scissors" as const,
    nombre: "Barbería",
    descripcion: "Cortes, afeitado, arreglo de barba y bigote",
    preset: barbershopPreset,
  },
  {
    key: "hair-salon" as BusinessType,
    icon: "user" as const,
    nombre: "Peluquería",
    descripcion: "Cortes, color, peinados y tratamientos capilares",
    preset: hairSalonPreset,
  },
  {
    key: "full-aesthetic" as BusinessType,
    icon: "shield" as const,
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
    <OnboardingLayout scrollable={false}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <OnboardingProgressDots currentStep={1} />
        <ThemedText style={styles.titulo}>
          ¿Qué tipo de negocio tienes?
        </ThemedText>
        <ThemedText style={styles.subtitulo}>
          Configuraremos la app con las opciones ideales para tu negocio.
        </ThemedText>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.cards}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {TIPOS.map((tipo, i) => {
          const seleccionado = config.businessType === tipo.key;
          const primary = tipo.preset.theme.primaryColor;
          return (
            <Animated.View
              key={tipo.key}
              entering={FadeInDown.delay(i * 80).duration(400)}
            >
              <Pressable
                onPress={() => seleccionar(tipo)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderColor: seleccionado
                      ? primary
                      : "rgba(255,255,255,0.12)",
                    backgroundColor: seleccionado
                      ? hexToRgba(primary, 0.1)
                      : "rgba(255,255,255,0.05)",
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                <Feather
                  name={tipo.icon}
                  size={22}
                  color={
                    seleccionado
                      ? primary
                      : "rgba(255,255,255,0.65)"
                  }
                  style={styles.cardIcon}
                />
                <View style={styles.cardTexto}>
                  <ThemedText style={styles.cardNombre}>
                    {tipo.nombre}
                  </ThemedText>
                  <ThemedText style={styles.cardDesc}>
                    {tipo.descripcion}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.check,
                    seleccionado && {
                      backgroundColor: primary,
                      borderColor: primary,
                    },
                  ]}
                >
                  {seleccionado ? (
                    <Feather name="check" size={12} color="#FFFFFF" />
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing.lg,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 20,
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  cards: {
    gap: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 0.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardIcon: {
    marginRight: Spacing.xs,
  },
  cardTexto: {
    flex: 1,
  },
  cardNombre: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
