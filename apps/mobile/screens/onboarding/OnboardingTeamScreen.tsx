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
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { CustomColorPickerModal } from "@/screens/onboarding/components/CustomColorPickerModal";
import { COLORES_PRIMARIOS } from "@/screens/onboarding/constants/colores-onboarding";
import { Gradients, Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

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
  const [modalColorVisible, setModalColorVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [empleadosAgregados, setEmpleadosAgregados] = useState<
    { id: string; name: string; color: string }[]
  >([]);

  const esColorDePaleta = COLORES_PRIMARIOS.some((c) => c.valor === color);

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
        <View style={styles.paletaFila}>
          {COLORES_PRIMARIOS.map((c) => (
            <Pressable
              key={c.valor}
              onPress={() => setColor(c.valor)}
              style={[
                styles.swatchOuterFila,
                color === c.valor &&
                  esColorDePaleta &&
                  styles.swatchOuterSelected,
              ]}
            >
              <View style={[styles.swatchFila, { backgroundColor: c.valor }]} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => setModalColorVisible(true)}
            style={[
              styles.swatchOuterFila,
              !esColorDePaleta && styles.swatchOuterSelected,
            ]}
            accessibilityLabel="Elegir color personalizado en calendario"
          >
            <LinearGradient
              colors={[...Gradients.onboarding.colors]}
              start={Gradients.onboarding.linearStart}
              end={Gradients.onboarding.linearEnd}
              style={styles.swatchCustomFila}
            >
              <Feather
                name="sliders"
                size={16}
                color="rgba(255,255,255,0.95)"
              />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

      <CustomColorPickerModal
        visible={modalColorVisible}
        initialHex={color}
        titulo="Color en calendario personalizado"
        onClose={() => setModalColorVisible(false)}
        onConfirm={(hex) => {
          setColor(hex);
          setModalColorVisible(false);
        }}
      />

      {/* Botón agregar + atrás en la misma fila */}
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

      {/* Continuar y Omitir en la misma fila al fondo — mismo patrón del onboarding */}
      <Animated.View
        entering={FadeInDown.delay(90).duration(300)}
        style={styles.footer}
      >
        <GradientCTAButton
          variant="outline"
          label="Omitir"
          onPress={onNext}
          style={styles.btnFlex}
        />
        <GradientCTAButton
          label="Continuar"
          icon="arrow-right"
          onPress={onNext}
          disabled={empleadosAgregados.length === 0}
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
    color: "#40E0D0",
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
  /** 6 sugeridos + custom en una fila (mismo patrón que paso 2). */
  paletaFila: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 4,
    alignItems: "center",
  },
  swatchOuterFila: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchOuterSelected: {
    borderColor: "#FFFFFF",
  },
  swatchFila: {
    ...StyleSheet.absoluteFillObject,
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 5,
  },
  swatchCustomFila: {
    ...StyleSheet.absoluteFillObject,
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },
  btnFlex: {
    flex: 1,
  },
  btnFlexWide: {
    flex: 2,
  },
});
