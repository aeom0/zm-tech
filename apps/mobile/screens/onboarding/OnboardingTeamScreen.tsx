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
import { supabase } from "@/lib/supabase";

const COLORES_EMPLEADO = [
  "#7B2D8E",
  "#E91E8C",
  "#1A237E",
  "#00695C",
  "#E65100",
  "#B71C1C",
  "#F9A825",
  "#0277BD",
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
      const { error } = await supabase.from("employees").insert({
        name: nombreFinal,
        email: email.trim() || null,
        phone: null,
        color,
        role: "employee",
        commission_percentage: pct,
        notes: null,
        is_active: true,
      });

      if (error) {
        throw new Error(error.message);
      }

      onNext();
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "No se pudo guardar el empleado.",
      );
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
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3, 4].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === 2 ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <ThemedText style={styles.titulo}>
          Agrega tu primer {staffLabel}
        </ThemedText>
        <ThemedText style={styles.subtitulo}>
          Puedes agregar más desde Más → {config.terminology.staff} después de
          configurar.
        </ThemedText>
      </Animated.View>

      {/* Nombre */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Nombre *</ThemedText>
        <TextInput
          style={styles.input}
          placeholder={`Nombre del ${staffLabel}`}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
        />
      </Animated.View>

      {/* Email */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Email (opcional)</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Animated.View>

      {/* Comisión */}
      <Animated.View
        entering={FadeInDown.delay(220).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>
          Comisión del {staffLabel} (%)
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Ej. 60"
          placeholderTextColor="rgba(255,255,255,0.25)"
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
      <Animated.View
        entering={FadeInDown.delay(280).duration(400)}
        style={styles.campo}
      >
        <ThemedText style={styles.label}>Color en el calendario</ThemedText>
        <View style={styles.paleta}>
          {COLORES_EMPLEADO.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorChipWrapper,
                color === c && styles.colorChipWrapperSeleccionado,
              ]}
            >
              <View style={[styles.colorChip, { backgroundColor: c }]} />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Botones */}
      <Animated.View
        entering={FadeInDown.delay(340).duration(400)}
        style={styles.botones}
      >
        <Pressable onPress={onBack} style={styles.botonSecundario}>
          <ThemedText style={styles.botonSecundarioTexto}>Atrás</ThemedText>
        </Pressable>
        <Pressable
          onPress={guardar}
          disabled={guardando}
          style={[styles.botonPrimario, guardando && styles.botonDisabled]}
        >
          <ThemedText style={styles.botonPrimarioTexto}>
            {guardando ? "Guardando…" : "Continuar"}
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
  scroll: { flex: 1, backgroundColor: "#111318" },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  header: {
    paddingTop: Spacing["3xl"],
    paddingBottom: Spacing.xl,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.lg,
  },
  dot: {
    height: 3,
    borderRadius: 2,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
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
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 6,
  },
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
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  botonPrimario: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  botonPrimarioTexto: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  botonDisabled: { opacity: 0.6 },
  saltarBtn: { alignItems: "center", paddingVertical: Spacing.md },
  saltarTexto: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textDecorationLine: "underline",
  },
});
