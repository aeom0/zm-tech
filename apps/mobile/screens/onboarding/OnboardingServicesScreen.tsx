import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
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
  "barbershop": ["Cortes", "Barba y Bigote", "Tratamientos", "Color y Tintura"],
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
      const rows = seleccionadas.map((c, i) => ({
        name: c.nombre,
        order: i + 1,
      }));
      const { error } = await supabase
        .from("service_categories")
        .insert(rows);
      if (error) throw error;
      onNext();
    } catch {
      // Si falla (ej. categorías ya existen), continuar de todos modos
      onNext();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <ThemedText style={styles.paso}>Paso 4 de 4</ThemedText>
        <ThemedText style={styles.titulo}>
          Categorías de servicios
        </ThemedText>
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
                  cat.seleccionada && {
                    backgroundColor: config.theme.primaryColor,
                    borderColor: config.theme.primaryColor,
                  },
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
          {guardando ? (
            <ActivityIndicator color={Colors.light.white} size="small" />
          ) : (
            <ThemedText style={styles.botonPrimarioTexto}>
              Finalizar →
            </ThemedText>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
    paddingHorizontal: Spacing.lg,
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
  lista: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  itemSeleccionado: {
    borderColor: Colors.light.violet,
    backgroundColor: Colors.light.primaryLight,
  },
  itemPressed: { opacity: 0.8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: Colors.light.white,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  itemNombre: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.text,
  },
  botones: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing["2xl"],
    paddingTop: Spacing.md,
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
    justifyContent: "center",
  },
  botonPrimarioTexto: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.white,
  },
  botonDisabled: { opacity: 0.6 },
});
