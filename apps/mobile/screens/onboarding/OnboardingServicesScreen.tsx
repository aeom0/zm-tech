import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

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

  return (
    <OnboardingLayout scrollable={false}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <OnboardingProgressDots currentStep={4} />
        <ThemedText style={styles.titulo}>Categorías de servicios</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Estas categorías aparecerán en tu catálogo. Puedes editarlas después.
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
                  <ThemedText style={styles.checkMark}>✓</ThemedText>
                ) : null}
              </View>
              <ThemedText style={styles.itemNombre}>{cat.nombre}</ThemedText>
            </Pressable>
          </Animated.View>
        ))}
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
    paddingBottom: Spacing.lg,
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
    borderColor: "rgba(255,255,255,0.12)",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  itemSeleccionado: {
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  itemPressed: { opacity: 0.8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  checkMark: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  itemNombre: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
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
