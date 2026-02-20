import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";

interface OnboardingCompleteScreenProps {
  onFinish: () => void;
}

export default function OnboardingCompleteScreen({
  onFinish,
}: OnboardingCompleteScreenProps) {
  const { config, markConfigured } = useTenant();

  const emojiScale = useSharedValue(0);
  const emojiOpacity = useSharedValue(0);

  useEffect(() => {
    emojiOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    emojiScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 120 }));
  }, [emojiOpacity, emojiScale]);

  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [{ scale: emojiScale.value }],
  }));

  const handleFinish = async () => {
    await markConfigured();
    onFinish();
  };

  const emoji =
    config.businessType === "barbershop"
      ? "✂️"
      : config.businessType === "hair-salon"
        ? "💇"
        : config.businessType === "full-aesthetic"
          ? "🌿"
          : "💅";

  return (
    <View style={[styles.container, { backgroundColor: config.theme.primaryColor }]}>
      {/* Círculos decorativos */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      <Animated.View style={[styles.emojiWrap, emojiStyle]}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.textos}>
        <ThemedText style={styles.titulo}>¡Todo listo!</ThemedText>
        <ThemedText style={styles.nombre}>{config.businessName}</ThemedText>
        <ThemedText style={styles.subtitulo}>
          Tu app está configurada y lista para gestionar{" "}
          {config.terminology.appointment}s, {config.terminology.staff} y servicios.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.resumen}>
        <ResumenItem
          icono="🏪"
          texto={`Tipo: ${etiquetaTipo(config.businessType)}`}
        />
        <ResumenItem
          icono="🎨"
          texto={`Color: ${config.theme.primaryColor}`}
          colorMuestra={config.theme.primaryColor}
        />
        <ResumenItem
          icono="💬"
          texto={`Personal: "${config.terminology.staff}"`}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(900).duration(500)}>
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [
            styles.boton,
            { backgroundColor: config.theme.accentColor },
            pressed && styles.botonPressed,
          ]}
        >
          <ThemedText style={styles.botonTexto}>
            Ir al panel →
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ResumenItem({
  icono,
  texto,
  colorMuestra,
}: {
  icono: string;
  texto: string;
  colorMuestra?: string;
}) {
  return (
    <View style={resumenStyles.fila}>
      <ThemedText style={resumenStyles.icono}>{icono}</ThemedText>
      <ThemedText style={resumenStyles.texto}>{texto}</ThemedText>
      {colorMuestra && (
        <View
          style={[resumenStyles.muestra, { backgroundColor: colorMuestra }]}
        />
      )}
    </View>
  );
}

function etiquetaTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    "spa-nails":       "Spa / Uñas",
    "barbershop":      "Barbería",
    "hair-salon":      "Peluquería",
    "full-aesthetic":  "Estética Integral",
  };
  return mapa[tipo] ?? tipo;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  circleTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circleBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  emojiWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 48 },
  textos: { alignItems: "center", gap: Spacing.sm },
  titulo: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.light.white,
    textAlign: "center",
  },
  nombre: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
  },
  resumen: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    width: "100%",
    gap: Spacing.sm,
  },
  boton: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  botonPressed: { opacity: 0.85 },
  botonTexto: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.text,
  },
});

const resumenStyles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  icono: { fontSize: 18 },
  texto: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    flex: 1,
  },
  muestra: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
});
