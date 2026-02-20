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
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

const COLORES_PRIMARIOS = [
  { label: "Violeta",   valor: "#7B2D8E" },
  { label: "Rosa",      valor: "#E91E8C" },
  { label: "Azul",      valor: "#1A237E" },
  { label: "Verde",     valor: "#00695C" },
  { label: "Naranja",   valor: "#E65100" },
  { label: "Rojo",      valor: "#B71C1C" },
];

const COLORES_ACENTO = [
  { label: "Dorado",    valor: "#D4AF37" },
  { label: "Amarillo",  valor: "#F9A825" },
  { label: "Plateado",  valor: "#9E9E9E" },
  { label: "Blanco",    valor: "#FFFFFF" },
  { label: "Cobre",     valor: "#BF6516" },
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
  const [nombre, setNombre] = useState(config.businessName === "Mi Salón" ? "" : config.businessName);
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
      theme: { ...config.theme, primaryColor: colorPrimario, accentColor: colorAcento },
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
        <ThemedText style={styles.paso}>Paso 2 de 4</ThemedText>
        <ThemedText style={styles.titulo}>Datos de tu negocio</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Personaliza el nombre y los colores que verás en toda la app.
        </ThemedText>
      </Animated.View>

      {/* Nombre */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Nombre del negocio *</ThemedText>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Ej. Spa Bella, Barbería Clásica…"
          placeholderTextColor={Colors.light.textMuted}
          value={nombre}
          onChangeText={(t) => { setNombre(t); setError(null); }}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {error && (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        )}
      </Animated.View>

      {/* Color primario */}
      <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Color principal</ThemedText>
        <View style={styles.paleta}>
          {COLORES_PRIMARIOS.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorPrimario(c.valor)}
              style={[
                styles.colorChip,
                { backgroundColor: c.valor },
                colorPrimario === c.valor && styles.colorChipSeleccionado,
              ]}
            >
              {colorPrimario === c.valor && (
                <ThemedText style={styles.colorCheck}>✓</ThemedText>
              )}
            </Pressable>
          ))}
        </View>
        <ThemedText style={styles.colorNombre}>
          {COLORES_PRIMARIOS.find((c) => c.valor === colorPrimario)?.label ?? colorPrimario}
        </ThemedText>
      </Animated.View>

      {/* Color de acento */}
      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Color de acento</ThemedText>
        <View style={styles.paleta}>
          {COLORES_ACENTO.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColorAcento(c.valor)}
              style={[
                styles.colorChip,
                { backgroundColor: c.valor, borderColor: Colors.light.border },
                colorAcento === c.valor && styles.colorChipSeleccionado,
              ]}
            >
              {colorAcento === c.valor && (
                <ThemedText
                  style={[
                    styles.colorCheck,
                    { color: c.valor === "#FFFFFF" ? Colors.light.text : Colors.light.white },
                  ]}
                >
                  ✓
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>
        <ThemedText style={styles.colorNombre}>
          {COLORES_ACENTO.find((c) => c.valor === colorAcento)?.label ?? colorAcento}
        </ThemedText>
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
      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.botones}>
        <Pressable onPress={onBack} style={styles.botonSecundario}>
          <ThemedText style={styles.botonSecundarioTexto}>← Atrás</ThemedText>
        </Pressable>
        <Pressable
          onPress={continuar}
          style={[styles.botonPrimario, { backgroundColor: colorPrimario }]}
        >
          <ThemedText style={styles.botonPrimarioTexto}>Continuar →</ThemedText>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.light.backgroundRoot },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
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
  campo: { marginBottom: Spacing.xl },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.light.card,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.light.text,
  },
  inputError: { borderColor: Colors.light.error },
  errorText: { color: Colors.light.error, fontSize: 13, marginTop: 4 },
  paleta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  colorChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  colorChipSeleccionado: { borderColor: Colors.light.text, borderWidth: 2.5 },
  colorCheck: { color: Colors.light.white, fontSize: 18, fontWeight: "700" },
  colorNombre: { fontSize: 13, color: Colors.light.textMuted, marginTop: Spacing.sm },
  preview: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewNombre: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.white,
    flex: 1,
  },
  previewTag: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  previewTagText: { fontSize: 12, fontWeight: "600", color: Colors.light.text },
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  botonSecundario: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.xs,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  botonSecundarioTexto: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.text,
  },
  botonPrimario: {
    flex: 2,
    borderRadius: BorderRadius.xs,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  botonPrimarioTexto: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.white,
  },
});
