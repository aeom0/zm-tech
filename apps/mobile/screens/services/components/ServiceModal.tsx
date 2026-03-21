import React, { useEffect, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { BorderRadius, Spacing, Colors } from "@/constants/theme";

import type { Service, ServiceCategory } from "../types";
import type { ServicePayload } from "../hooks/useServicesData";

interface ServiceModalProps {
  visible: boolean;
  onClose: () => void;
  editing: Service | null;
  categories: ServiceCategory[];
  onSave: (payload: ServicePayload) => void;
  savePending: boolean;
  onDelete: (s: Service) => void;
  deletePending: boolean;
}

export function ServiceModal({
  visible,
  onClose,
  editing,
  categories,
  onSave,
  savePending,
  onDelete,
  deletePending,
}: ServiceModalProps) {
  const { theme } = useTheme();
  const { config } = useTenant();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editing) {
      setName(editing.name);
      setCategoryId(editing.category_id ?? "");
      setPrice(editing.price);
      setDuration(String(editing.duration));
      setIsActive(editing.is_active);
    } else {
      setName("");
      setCategoryId(categories[0]?.id ?? "");
      setPrice("");
      setDuration("60");
      setIsActive(true);
    }
  }, [visible, editing, categories]);

  const handleSubmit = () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Faltan datos", "Nombre y precio son obligatorios.");
      return;
    }
    const dur = parseInt(duration, 10);
    if (!Number.isFinite(dur) || dur <= 0) {
      Alert.alert("Duración inválida", "Indica minutos válidos.");
      return;
    }
    const payload: ServicePayload = {
      name: name.trim(),
      category_id: categoryId,
      price,
      duration: dur,
      is_active: isActive,
    };
    onSave(payload);
  };

  const pending = savePending;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View
          style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              {editing ? "Editar servicio" : "Nuevo servicio"}
            </ThemedText>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Nombre
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Nombre del servicio"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
            />

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Categoría
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
            >
              {categories.map((c) => {
                const sel = categoryId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.chip,
                      { borderColor: theme.border },
                      sel && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        sel && { color: Colors.light.white },
                      ]}
                    >
                      {c.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.half}>
                <ThemedText
                  style={[styles.label, { color: theme.textSecondary }]}
                >
                  {`Precio (${config.locale.currency.symbol})`}
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="0,00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
              <View style={styles.half}>
                <ThemedText
                  style={[styles.label, { color: theme.textSecondary }]}
                >
                  Duración (min)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="60"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text }}>
                Servicio activo
              </ThemedText>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: theme.border, true: theme.primary + "99" }}
                thumbColor={isActive ? theme.primary : theme.textMuted}
              />
            </View>

            {editing && (
              <Pressable
                style={[styles.deleteBtn, { borderColor: theme.error }]}
                onPress={() => {
                  onClose();
                  onDelete(editing);
                }}
                disabled={deletePending}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
                <ThemedText style={{ color: theme.error, fontWeight: "600" }}>
                  Eliminar servicio
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[styles.submit, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={pending}
            >
              {pending ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <ThemedText style={styles.submitText}>
                  {editing ? "Guardar" : "Crear servicio"}
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  half: {
    flex: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  submit: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  submitText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
