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
    descripcion: "Manicure, pedicure, tratamientos",
    preset: spaNavilsPreset,
  },
  {
    key: "barbershop" as BusinessType,
    icon: "scissors" as const,
    nombre: "Barbería",
    descripcion: "Cortes, barba, afeitado clásico",
    preset: barbershopPreset,
  },
  {
    key: "hair-salon" as BusinessType,
    icon: "user" as const,
    nombre: "Peluquería",
    descripcion: "Cortes, peinados, coloración",
    preset: hairSalonPreset,
  },
  {
    key: "full-aesthetic" as BusinessType,
    icon: "shield" as const,
    nombre: "Estética Integral",
    descripcion: "Servicios completos de belleza",
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
        <ThemedText style={styles.badge}>PASO 1 DE 4</ThemedText>
        <OnboardingProgressDots currentStep={1} />
        <ThemedText style={styles.titulo}>
          ¿Qué tipo de negocio tienes?
        </ThemedText>
        <ThemedText style={styles.subtitulo}>
          Personalizamos todo según tu tipo de salón
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
                      : "rgba(255,255,255,0.10)",
                    backgroundColor: seleccionado
                      ? hexToRgba(primary, 0.1)
                      : "rgba(255,255,255,0.04)",
                  },
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Ícono con fondo circular */}
                <View
                  style={[
                    styles.iconBg,
                    {
                      backgroundColor: hexToRgba(primary, 0.15),
                    },
                  ]}
                >
                  <Feather
                    name={tipo.icon}
                    size={28}
                    color={seleccionado ? primary : "rgba(255,255,255,0.65)"}
                  />
                </View>

                <View style={styles.cardTexto}>
                  <ThemedText style={styles.cardNombre}>
                    {tipo.nombre}
                  </ThemedText>
                  <ThemedText style={styles.cardDesc}>
                    {tipo.descripcion}
                  </ThemedText>
                </View>

                {/* Check absolute top-right */}
                <View
                  style={[
                    styles.check,
                    seleccionado
                      ? { backgroundColor: primary, borderColor: primary }
                      : { borderColor: "rgba(255,255,255,0.25)" },
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
    paddingBottom: Spacing["2xl"],
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E91E8C",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  subtitulo: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 22,
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
    borderRadius: 20,
    borderWidth: 0.5,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardPressed: {
    opacity: 0.88,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTexto: {
    flex: 1,
  },
  cardNombre: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 18,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 12,
    right: 12,
  },
});
