import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GradientProgressDots } from "@/components/GradientProgressDots";
import { Spacing, BorderRadius } from "@/constants/theme";
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
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <GradientProgressDots total={5} current={0} />
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
                <View style={styles.iconWrapper}>
                  <Feather
                    name={tipo.icon}
                    size={18}
                    color="rgba(255,255,255,0.6)"
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
                <View
                  style={[styles.check, seleccionado && styles.checkSelected]}
                >
                  {seleccionado && (
                    <Feather name="check" size={10} color="#000000" />
                  )}
                </View>
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
    backgroundColor: "#111318",
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing.xl,
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
    marginBottom: 24,
  },
  cards: {
    gap: Spacing.md,
    paddingBottom: Spacing["3xl"],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 14,
    marginBottom: 8,
    gap: Spacing.md,
  },
  cardSeleccionado: {
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
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
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
});
