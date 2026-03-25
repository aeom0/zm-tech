import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { useTheme } from "@/hooks/useTheme";
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
  const { theme } = useTheme();
  const staffLabel = config.terminology.staffSingular;

  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(config.theme.primaryColor);
  const [guardando, setGuardando] = useState(false);
  const [empleadosAgregados, setEmpleadosAgregados] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);

  const guardar = async () => {
    const nombreFinal = nombre.trim();
    if (!nombreFinal) {
      Alert.alert("Campo requerido", "El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          name: nombreFinal,
          color,
          is_active: true,
          payment_mode: "commission",
          commission_percentage: null,
          salary_amount: null,
        })
        .select("id, name, color")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setEmpleadosAgregados((prev) => [
          ...prev,
          { id: data.id, name: data.name, color: data.color },
        ]);
      }
      setNombre("");
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
    <OnboardingLayout scrollable>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.badge}>PASO 3 DE 4</ThemedText>
        <OnboardingProgressDots currentStep={3} />
        <ThemedText style={styles.titulo}>
          Agrega tu primer {staffLabel}
        </ThemedText>
        <ThemedText style={styles.subtitulo}>
          Puedes agregar más después de configurar.
        </ThemedText>
      </Animated.View>

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
                styles.swatchOuter,
                color === c && styles.swatchOuterSelected,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: c }]} />
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(340).duration(400)}
        style={styles.botones}
      >
        <GradientCTAButton
          variant="outline"
          label="Atrás"
          onPress={onBack}
          style={styles.btnFlex}
        />
        <GradientCTAButton
          label={`Agregar ${config.terminology.staffSingular}`}
          icon="plus"
          onPress={guardar}
          loading={guardando}
          style={styles.btnFlexWide}
          disabled={!nombre.trim()}
        />
      </Animated.View>

      {empleadosAgregados.length > 0 && (
        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
          <View style={styles.empleadosList}>
            {empleadosAgregados.map((e) => (
              <View key={e.id} style={styles.empleadoRow}>
                <View
                  style={[styles.empleadoSwatch, { backgroundColor: e.color }]}
                />
                <ThemedText style={styles.empleadoName} numberOfLines={1}>
                  {e.name}
                </ThemedText>
              </View>
            ))}
          </View>

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            💡 El modo de pago de cada{" "}
            {config.terminology.staffSingular.toLowerCase()} se configura en Más
            → {config.terminology.staff} después del registro.
          </Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(90).duration(300)}>
        <GradientCTAButton
          label="Continuar"
          icon="arrow-right"
          onPress={onNext}
          disabled={empleadosAgregados.length === 0}
          style={styles.continueBtn}
        />
      </Animated.View>

      <GradientCTAButton
        variant="outline"
        label="Omitir"
        onPress={onNext}
        style={styles.omitir}
      />
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
  hint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  empleadosList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  empleadoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  empleadoSwatch: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  empleadoName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  continueBtn: {
    marginTop: Spacing.md,
    alignSelf: "center",
    minWidth: 260,
  },
  paleta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  swatchOuter: {
    width: 48,
    height: 48,
    borderRadius: 8,
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
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  btnFlex: {
    flex: 1,
  },
  btnFlexWide: {
    flex: 2,
  },
  omitir: {
    alignSelf: "center",
    marginBottom: Spacing["2xl"],
    minWidth: 200,
  },
});
