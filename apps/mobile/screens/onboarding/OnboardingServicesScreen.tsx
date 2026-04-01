import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  OnboardingLayout,
  OnboardingProgressDots,
  GradientCTAButton,
} from "@/screens/onboarding/components";
import { Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";

interface Categoria {
  id: string;
  nombre: string;
  seleccionada: boolean;
}

const CATEGORIAS_POR_TIPO: Record<string, string[]> = {
  "spa-nails": ["Uñas", "Pestañas", "Cejas y Rostro", "Depilación"],
  barbershop: ["Cortes", "Barba y Bigote", "Tratamientos", "Color y Tintura"],
  "hair-salon": ["Cortes", "Color", "Tratamientos", "Peinados"],
  "full-aesthetic": [
    "Tratamientos Faciales",
    "Tratamientos Corporales",
    "Uñas",
    "Cabello",
    "Depilación",
  ],
};

interface OnboardingServicesScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingServicesScreen({
  onNext,
  onBack,
}: OnboardingServicesScreenProps) {
  const { config } = useTenant();

  const nombresIniciales =
    CATEGORIAS_POR_TIPO[config.businessType] ??
    CATEGORIAS_POR_TIPO["spa-nails"];

  const [categorias, setCategorias] = useState<Categoria[]>(
    nombresIniciales.map((nombre, i) => ({
      id: `cat-${i}`,
      nombre,
      seleccionada: true,
    })),
  );
  const [guardando, setGuardando] = useState(false);

  const toggleCategoria = (id: string) => {
    setCategorias((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, seleccionada: !c.seleccionada } : c,
      ),
    );
  };

  const guardar = async () => {
    const seleccionadas = categorias.filter((c) => c.seleccionada);

    if (seleccionadas.length === 0) {
      onNext();
      return;
    }

    setGuardando(true);
    try {
      const payload = seleccionadas.map((c, index) => ({
        name: c.nombre,
        order: index + 1,
      }));

      const { error } = await supabase
        .from("service_categories")
        .insert(payload);

      if (error) {
        // eslint-disable-next-line no-console
        console.warn(
          "[OnboardingServices] error al crear categorías en Supabase, continuando de todos modos",
          error,
        );
      }

      onNext();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        "[OnboardingServices] excepción inesperada al crear categorías",
        error,
      );
      onNext();
    } finally {
      setGuardando(false);
    }
  };

  const seleccionadasCount = categorias.filter((c) => c.seleccionada).length;

  return (
    <OnboardingLayout scrollable={false}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.badge}>PASO 4 DE 4</ThemedText>
        <OnboardingProgressDots currentStep={4} />
        <ThemedText style={styles.titulo}>Servicios que ofreces</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Selecciona las categorías para tu negocio
        </ThemedText>
      </Animated.View>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {categorias.map((cat, i) => (
          <Animated.View
            key={cat.id}
            entering={FadeInDown.delay(i * 60).duration(350)}
          >
            <Pressable
              onPress={() => toggleCategoria(cat.id)}
              style={({ pressed }) => [
                styles.item,
                cat.seleccionada && styles.itemSeleccionado,
                pressed && styles.itemPressed,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  cat.seleccionada && styles.checkboxSelected,
                ]}
              >
                {cat.seleccionada ? (
                  <Feather name="check" size={12} color="#FFFFFF" />
                ) : null}
              </View>
              <ThemedText style={styles.itemNombre}>{cat.nombre}</ThemedText>
            </Pressable>
          </Animated.View>
        ))}

        {/* Contador de seleccionadas */}
        {seleccionadasCount > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.contadorWrap}
          >
            <Feather name="heart" size={13} color="#40E0D0" />
            <ThemedText style={styles.contador}>
              {seleccionadasCount}{" "}
              {seleccionadasCount === 1
                ? "categoría seleccionada"
                : "categorías seleccionadas"}
            </ThemedText>
          </Animated.View>
        ) : null}
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
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
          onPress={guardar}
          loading={guardando}
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
  listWrap: {
    flex: 1,
  },
  lista: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.10)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: Spacing.md,
  },
  itemSeleccionado: {
    borderColor: "#40E0D0",
    backgroundColor: "rgba(64,224,208,0.07)",
  },
  itemPressed: { opacity: 0.8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#40E0D0",
    borderColor: "#40E0D0",
  },
  itemNombre: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  contadorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  contador: {
    fontSize: 13,
    color: "#40E0D0",
    fontWeight: "500",
  },
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  btnFlex: {
    flex: 1,
  },
  btnFlexWide: {
    flex: 2,
  },
});
