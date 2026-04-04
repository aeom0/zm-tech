import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Onboarding, Spacing } from "@/constants/theme";
import {
  hexToRgb,
  hsvToHex,
  rgbToHsv,
} from "@/lib/color-hsv";

export interface CustomColorPickerModalProps {
  visible: boolean;
  initialHex: string;
  titulo: string;
  onClose: () => void;
  onConfirm: (hex: string) => void;
}

/**
 * Selector HSV (matiz / saturación / brillo) para elegir cualquier color hex.
 */
export function CustomColorPickerModal({
  visible,
  initialHex,
  titulo,
  onClose,
  onConfirm,
}: CustomColorPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const [h, setH] = useState(200);
  const [s, setS] = useState(0.75);
  const [v, setV] = useState(0.85);

  useEffect(() => {
    if (!visible) return;
    const rgb =
      hexToRgb(initialHex) ?? hexToRgb(Onboarding.lunarisAccent);
    if (rgb) {
      const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setH(next.h);
      setS(next.s);
      setV(next.v);
    }
  }, [visible, initialHex]);

  const previewHex = useMemo(() => hsvToHex(h, s, v), [h, s, v]);

  const aplicar = () => {
    onConfirm(previewHex);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              maxHeight: windowH * 0.88,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedText style={styles.titulo}>{titulo}</ThemedText>

          <View
            style={[styles.preview, { backgroundColor: previewHex }]}
            accessibilityLabel={`Vista previa del color ${previewHex}`}
          />

          <ThemedText style={styles.hexLabel}>{previewHex}</ThemedText>

          <View style={styles.sliderBlock}>
            <ThemedText style={styles.sliderLabel}>Matiz</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={360}
              step={1}
              value={h}
              onValueChange={setH}
              minimumTrackTintColor={Onboarding.lunarisAccent}
              maximumTrackTintColor="rgba(255,255,255,0.25)"
              thumbTintColor={Onboarding.text}
            />
          </View>

          <View style={styles.sliderBlock}>
            <ThemedText style={styles.sliderLabel}>Saturación</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={s}
              onValueChange={setS}
              minimumTrackTintColor={Onboarding.lunarisAccent}
              maximumTrackTintColor="rgba(255,255,255,0.25)"
              thumbTintColor={Onboarding.text}
            />
          </View>

          <View style={styles.sliderBlock}>
            <ThemedText style={styles.sliderLabel}>Brillo</ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={v}
              onValueChange={setV}
              minimumTrackTintColor={Onboarding.lunarisAccent}
              maximumTrackTintColor="rgba(255,255,255,0.25)"
              thumbTintColor={Onboarding.text}
            />
          </View>

          <View style={styles.acciones}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.btnSec, pressed && styles.pressed]}
            >
              <ThemedText style={styles.btnSecTexto}>Cancelar</ThemedText>
            </Pressable>
            <Pressable
              onPress={aplicar}
              style={({ pressed }) => [styles.btnPri, pressed && styles.pressed]}
            >
              <ThemedText
                style={styles.btnPriTexto}
                lightColor={Onboarding.canvasBackground}
                darkColor={Onboarding.canvasBackground}
              >
                Aplicar
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Onboarding.canvasBackground,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  titulo: {
    fontSize: 17,
    fontWeight: "700",
    color: Onboarding.text,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  preview: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Onboarding.chipBorder,
    marginBottom: Spacing.sm,
  },
  hexLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Onboarding.textMuted,
    textAlign: "center",
    marginBottom: Spacing.lg,
    letterSpacing: 1,
  },
  sliderBlock: {
    marginBottom: Spacing.md,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Onboarding.textMuted,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  acciones: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  btnSec: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Onboarding.chipBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecTexto: {
    fontSize: 15,
    fontWeight: "600",
    color: Onboarding.textMuted,
  },
  btnPri: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Onboarding.lunarisAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPriTexto: {
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
  },
});
