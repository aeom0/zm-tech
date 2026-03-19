import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GradientButton } from "@/components/GradientButton";
import { GradientProgressDots } from "@/components/GradientProgressDots";
import { Spacing } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/lib/supabase";

interface Categoria {
  id: string;
  nombre: string;
  seleccionada: boolean;
}

// Categorías sugeridas por tipo de negocio
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
      // Si falla (ej. categorías ya existen), continuar de todos modos
      onNext();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <GradientProgressDots total={5} current={3} />
        <ThemedText style={styles.titulo}>Categorías de servicios</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Estas categorías aparecerán en tu catálogo. Puedes editarlas después.
        </ThemedText>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
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
                {cat.seleccionada && (
                  <ThemedText style={styles.checkMark}>✓</ThemedText>
                )}
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
        <Pressable onPress={onBack} style={styles.botonSecundario}>
          <ThemedText style={styles.botonSecundarioTexto}>Atrás</ThemedText>
        </Pressable>
        <GradientButton
          label="Finalizar"
          onPress={guardar}
          loading={guardando}
          style={styles.botonPrimarioWrapper}
        />
      </Animated.View>
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
  },
  lista: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
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
    paddingBottom: Spacing["2xl"],
    paddingTop: Spacing.md,
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
