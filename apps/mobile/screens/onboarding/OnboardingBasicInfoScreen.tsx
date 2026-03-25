import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

const COLORES_PRIMARIOS = [
  { label: "Violeta", valor: "#7B2D8E" },
  { label: "Rosa", valor: "#E91E8C" },
  { label: "Azul", valor: "#1A237E" },
  { label: "Verde", valor: "#00695C" },
  { label: "Naranja", valor: "#E65100" },
  { label: "Rojo", valor: "#B71C1C" },
];

const COLORES_ACENTO = [
  { label: "Dorado", valor: "#D4AF37" },
  { label: "Amarillo", valor: "#F9A825" },
  { label: "Plateado", valor: "#9E9E9E" },
  { label: "Blanco", valor: "#FFFFFF" },
  { label: "Cobre", valor: "#BF6516" },
];

interface OnboardingBasicInfoScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingBasicInfoScreen({
  onNext,
  onBack,
}: OnboardingBasicInfoScreenProps) {
  const { config, updateTenant } = useTenant();
  const [nombre, setNombre] = useState(
    config.businessName === "Mi Salón" ? "" : config.businessName,
  );
  const [colorPrimario, setColorPrimario] = useState(config.theme.primaryColor);
  const [colorAcento, setColorAcento] = useState(config.theme.accentColor);
  const [error, setError] = useState<string | null>(null);

  const continuar = async () => {
    const nombreFinal = nombre.trim();
    if (!nombreFinal) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }
    await updateTenant({
      businessName: nombreFinal,
      theme: {
        ...config.theme,
        primaryColor: colorPrimario,
        accentColor: colorAcento,
      },
    });
    onNext();
  };

  return (
    <OnboardingLayout scrollable>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.badge}>PASO 2 DE 4</ThemedText>
        <OnboardingProgressDots currentStep={2} />
        <ThemedText style={styles.titulo}>Cuéntanos sobre tu negocio</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Elige el nombre y la identidad visual
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Nombre del negocio *</ThemedText>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Ej. Spa Bella, Barbería Clásica…"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={nombre}
          onChangeText={(t) => {
            setNombre(t);
            setError(null);
          }}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(180).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Color principal</ThemedText>
        <View style={styles.paleta}>
          {COLORES_PRIMARIOS.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorPrimario(c.valor)}
              style={[
                styles.swatchOuter,
                colorPrimario === c.valor && styles.swatchOuterSelected,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Preview card glassmorphic */}
      <Animated.View
        entering={FadeInDown.delay(260).duration(400)}
        style={[
          styles.previewCard,
          { borderColor: colorPrimario + "40" },
        ]}
      >
        <View
          style={[styles.previewIconBg, { backgroundColor: colorPrimario + "33" }]}
        >
          <Feather name="scissors" size={28} color={colorPrimario} />
        </View>
        <ThemedText style={styles.previewNombre}>
          {nombre.trim() || "Mi Salón Hermoso"}
        </ThemedText>
        <ThemedText style={styles.previewSub}>Vista previa de tu marca</ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(340).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Color de acento</ThemedText>
        <View style={styles.paleta}>
          {COLORES_ACENTO.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorAcento(c.valor)}
              style={[
                styles.swatchOuter,
                colorAcento === c.valor && styles.swatchOuterSelected,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(420).duration(400)}
        style={styles.botones}
      >
        <GradientCTAButton
          variant="outline"
          label="Atrás"
          onPress={onBack}
          style={styles.btnFlex}
        />
        <GradientCTAButton
          label="Continuar"
          icon="arrow-right"
          onPress={continuar}
          style={styles.btnFlexWide}
        />
      </Animated.View>
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
  campo: { marginBottom: Spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#FFFFFF",
  },
  inputError: { borderColor: Colors.light.error },
  errorText: { color: Colors.light.error, fontSize: 12, marginTop: 4 },
  paleta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  swatchOuter: {
    width: 48,
    height: 48,
    borderRadius: 8,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchOuterSelected: {
    borderColor: "#FFFFFF",
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  previewCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 0.5,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  previewIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  previewNombre: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  previewSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  btnFlex: {
    flex: 1,
  },
  btnFlexWide: {
    flex: 2,
  },
});
