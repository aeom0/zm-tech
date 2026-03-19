import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GradientButton } from "@/components/GradientButton";
import { GradientProgressDots } from "@/components/GradientProgressDots";
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <GradientProgressDots total={5} current={1} />
        <ThemedText style={styles.titulo}>Datos de tu negocio</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Personaliza el nombre y los colores que verás en toda la app.
        </ThemedText>
      </Animated.View>

      {/* Nombre */}
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
        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
      </Animated.View>

      {/* Color primario */}
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
                styles.colorChipWrapper,
                colorPrimario === c.valor &&
                  styles.colorChipWrapperSeleccionado,
              ]}
            >
              <View style={[styles.colorChip, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Color de acento */}
      <Animated.View
        entering={FadeInDown.delay(260).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Color de acento</ThemedText>
        <View style={styles.paleta}>
          {COLORES_ACENTO.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorAcento(c.valor)}
              style={[
                styles.colorChipWrapper,
                colorAcento === c.valor && styles.colorChipWrapperSeleccionado,
              ]}
            >
              <View style={[styles.colorChip, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Vista previa de colores */}
      <Animated.View
        entering={FadeInDown.delay(320).duration(400)}
        style={[styles.preview, { backgroundColor: colorPrimario }]}
      >
        <ThemedText style={styles.previewNombre}>
          {nombre.trim() || "Tu negocio"}
        </ThemedText>
        <View style={[styles.previewTag, { backgroundColor: colorAcento }]}>
          <ThemedText style={styles.previewTagText}>Vista previa</ThemedText>
        </View>
      </Animated.View>

      {/* Botones */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={styles.botones}
      >
        <Pressable onPress={onBack} style={styles.botonSecundario}>
          <ThemedText style={styles.botonSecundarioTexto}>Atrás</ThemedText>
        </Pressable>
        <GradientButton
          label="Continuar"
          onPress={continuar}
          style={styles.botonPrimarioWrapper}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#111318" },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
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
  campo: { marginBottom: Spacing.xl },
  label: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  inputError: { borderColor: Colors.light.error },
  errorText: { color: Colors.light.error, fontSize: 12, marginTop: 4 },
  paleta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  colorChipWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  colorChipWrapperSeleccionado: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewNombre: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  previewTag: {
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  previewTagText: { fontSize: 11, fontWeight: "600", color: "#000000" },
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  botonSecundario: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  botonSecundarioTexto: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  botonPrimarioWrapper: {
    flex: 2,
  },
});
