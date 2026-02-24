import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { apiRequest } from "@/lib/query-client";

const COLORES_EMPLEADO = [
  "#7B2D8E", "#E91E8C", "#1A237E", "#00695C",
  "#E65100", "#B71C1C", "#F9A825", "#0277BD",
];

interface OnboardingTeamScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingTeamScreen({
  onNext,
  onBack,
}: OnboardingTeamScreenProps) {
  const { config } = useTenant();
  const staffLabel = config.terminology.staffSingular;

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [comision, setComision] = useState(
    String(config.commissions.defaultStaffPercent),
  );
  const [color, setColor] = useState(config.theme.primaryColor);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const nombreFinal = nombre.trim();
    if (!nombreFinal) {
      Alert.alert("Campo requerido", "El nombre es obligatorio.");
      return;
    }
    const pct = parseInt(comision, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert("Comisión inválida", "Debe ser un número entre 0 y 100.");
      return;
    }

    setGuardando(true);
    try {
      await apiRequest("POST", "/api/employees", {
        name: nombreFinal,
        email: email.trim() || null,
        color,
        role: "employee",
        commissionPercentage: pct,
        isActive: true,
      });
      onNext();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar el empleado.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.paso}>Paso 3 de 4</ThemedText>
        <ThemedText style={styles.titulo}>Agrega tu primer {staffLabel}</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Puedes agregar más desde Más → {config.terminology.staff} después de configurar.
        </ThemedText>
      </Animated.View>

      {/* Nombre */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Nombre *</ThemedText>
        <TextInput
          style={styles.input}
          placeholder={`Nombre del ${staffLabel}`}
          placeholderTextColor={Colors.light.textMuted}
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
        />
      </Animated.View>

      {/* Email */}
      <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Email (opcional)</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={Colors.light.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Animated.View>

      {/* Comisión */}
      <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>
          Comisión del {staffLabel} (%)
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ej. 60"
          placeholderTextColor={Colors.light.textMuted}
          value={comision}
          onChangeText={setComision}
          keyboardType="number-pad"
          maxLength={3}
        />
        <ThemedText style={styles.hint}>
          El {100 - (parseInt(comision, 10) || 0)}% restante es para el negocio.
        </ThemedText>
      </Animated.View>

      {/* Color */}
      <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.campo}>
        <ThemedText style={styles.label}>Color en el calendario</ThemedText>
        <View style={styles.paleta}>
          {COLORES_EMPLEADO.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorChip,
                { backgroundColor: c },
                color === c && styles.colorChipSeleccionado,
              ]}
            >
              {color === c && (
                <ThemedText style={styles.colorCheck}>✓</ThemedText>
              )}
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Botones */}
      <Animated.View entering={FadeInDown.delay(340).duration(400)} style={styles.botones}>
        <Pressable onPress={onBack} style={styles.botonSecundario}>
          <ThemedText style={styles.botonSecundarioTexto}>← Atrás</ThemedText>
        </Pressable>
        <Pressable
          onPress={guardar}
          disabled={guardando}
          style={[
            styles.botonPrimario,
            { backgroundColor: config.theme.primaryColor },
            guardando && styles.botonDisabled,
          ]}
        >
          <ThemedText style={styles.botonPrimarioTexto}>
            {guardando ? "Guardando…" : "Continuar →"}
          </ThemedText>
        </Pressable>
      </Animated.View>

      <Pressable onPress={onNext} style={styles.saltarBtn}>
        <ThemedText style={styles.saltarTexto}>Omitir este paso</ThemedText>
      </Pressable>
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
  hint: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginTop: 6,
  },
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
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  botonDisabled: { opacity: 0.6 },
  saltarBtn: { alignItems: "center", paddingVertical: Spacing.md },
  saltarTexto: {
    fontSize: 14,
    color: Colors.light.textMuted,
    textDecorationLine: "underline",
  },
});
