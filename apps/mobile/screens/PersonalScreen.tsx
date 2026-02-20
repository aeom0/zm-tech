import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
  role: string;
  commission_percentage: number;
  notes: string | null;
  is_active: boolean;
}

const PRESET_COLORS = [
  "#7B2D8E",
  "#D4AF37",
  "#4CAF50",
  "#2196F3",
  "#E91E63",
  "#FF9800",
];

export default function PersonalScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isAdmin } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    color: "#7B2D8E",
    commission_percentage: "40",
    notes: "",
    is_active: true,
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await apiRequest("PUT", `/api/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo guardar"),
  });

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      color: emp.color || "#7B2D8E",
      commission_percentage: String(emp.commission_percentage),
      notes: emp.notes ?? "",
      is_active: emp.is_active,
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!editing) return;
    const name = form.name.trim();
    if (!name) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }
    const commission = parseInt(form.commission_percentage, 10);
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      Alert.alert("Error", "La comisión debe ser un número entre 0 y 100");
      return;
    }

    updateMutation.mutate({
      id: editing.id,
      data: {
        name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        color: form.color.trim() || "#7B2D8E",
        commission_percentage: commission,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      },
    });
  };

  if (!isAdmin) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View style={styles.deniedWrap}>
          <Feather name="lock" size={32} color={theme.textMuted} />
          <ThemedText style={[styles.deniedText, { color: theme.text }]}>
            Solo administración puede gestionar el personal.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
          Toca una chica para editar nombre, correo, comisión % y más.
        </ThemedText>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.light.violet}
            style={styles.loader}
          />
        ) : (
          employees.map((emp) => (
            <Pressable
              key={emp.id}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  opacity: pressed ? 0.9 : 1,
                  borderLeftWidth: 4,
                  borderLeftColor: emp.color || theme.primary,
                },
              ]}
              onPress={() => openEdit(emp)}
            >
              <View style={styles.cardMain}>
                <ThemedText style={styles.cardName}>{emp.name}</ThemedText>
                {emp.email ? (
                  <ThemedText
                    style={[styles.cardEmail, { color: theme.textMuted }]}
                  >
                    {emp.email}
                  </ThemedText>
                ) : null}
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.badgeText, { color: theme.primary }]}
                    >
                      {emp.commission_percentage}% comisión
                    </ThemedText>
                  </View>
                  {!emp.is_active && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: theme.error + "20" },
                      ]}
                    >
                      <ThemedText
                        style={[styles.badgeText, { color: theme.error }]}
                      >
                        Inactiva
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editing ? "Editar chica" : "Nueva chica"}
              </ThemedText>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
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
                placeholder="Ej. Romina Melgar"
                placeholderTextColor={theme.textMuted}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Correo (@zmlashnails.com)
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
                placeholder="romina@zmlashnails.com"
                placeholderTextColor={theme.textMuted}
                value={form.email}
                onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Teléfono
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
                placeholder="+51 999 999 999"
                placeholderTextColor={theme.textMuted}
                value={form.phone}
                onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Comisión (%)
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
                placeholder="40"
                placeholderTextColor={theme.textMuted}
                value={form.commission_percentage}
                onChangeText={(t) =>
                  setForm((f) => ({ ...f, commission_percentage: t }))
                }
                keyboardType="number-pad"
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Color (hex)
              </ThemedText>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorChip,
                      { backgroundColor: c },
                      form.color === c && styles.colorChipSelected,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="#7B2D8E"
                placeholderTextColor={theme.textMuted}
                value={form.color}
                onChangeText={(t) => setForm((f) => ({ ...f, color: t }))}
                autoCapitalize="none"
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Notas
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Opcional"
                placeholderTextColor={theme.textMuted}
                value={form.notes}
                onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
                multiline
              />

              <Pressable
                style={[
                  styles.checkboxRow,
                  { borderColor: theme.border },
                  form.is_active && {
                    backgroundColor: theme.primary + "12",
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() =>
                  setForm((f) => ({ ...f, is_active: !f.is_active }))
                }
              >
                <Feather
                  name={form.is_active ? "check-circle" : "circle"}
                  size={22}
                  color={form.is_active ? theme.primary : theme.textMuted}
                />
                <ThemedText
                  style={[styles.checkboxLabel, { color: theme.text }]}
                >
                  Activa (aparece en agenda)
                </ThemedText>
              </Pressable>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFF" />
                    <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  loader: { marginTop: Spacing["3xl"] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cardMain: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  cardEmail: { fontSize: 13, marginBottom: Spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  deniedWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  deniedText: { fontSize: 16, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 72, paddingVertical: Spacing.md },
  colorRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  checkboxLabel: { fontSize: 15, fontWeight: "500" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
