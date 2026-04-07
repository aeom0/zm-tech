import React, { useState, useRef } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import {
  borrarAvatarSiEsStorage,
  subirAvatarEmpleadoDefault,
} from "@/lib/employeeAvatar";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { PaymentMode } from "@geemastudio/shared-schema";
import { EmployeePaymentBadge } from "@/screens/personal/components/EmployeePaymentBadge";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
  role: string;
  commission_percentage: number | null;
  payment_mode: PaymentMode;
  salary_amount: string | null;
  notes: string | null;
  is_active: boolean;
  avatar_url?: string | null;
}

export default function PersonalScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const { config } = useTenant();
  const currencySymbol = config.locale.currency.symbol;

  const presetColors = [
    config.theme.primaryColor,
    config.theme.accentColor,
    "#4CAF50",
    "#2196F3",
    "#E91E63",
    "#FF9800",
  ];
  const staffSingular = config.terminology.staffSingular || "Profesional";

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const ultimoMimeAvatarRef = useRef<string>("image/jpeg");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    color: config.theme.primaryColor,
    paymentMode: "commission" as PaymentMode,
    commission_percentage: String(config.commissions.defaultStaffPercent),
    salary_amount: "",
    notes: "",
    is_active: true,
  });

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as Employee[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string | null;
      phone: string | null;
      color: string;
      commission_percentage: number | null;
      payment_mode: PaymentMode;
      salary_amount: number | null;
      notes: string | null;
      is_active: boolean;
      avatar_url: string | null;
    }) => {
      const { error } = await supabase.from("employees").insert(data);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", "active"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo crear"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (emp: Employee) => {
      if (emp.avatar_url?.trim()) {
        try {
          await borrarAvatarSiEsStorage(supabase, emp.avatar_url);
        } catch {
          /* ignorar fallo de borrado en Storage */
        }
      }
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", emp.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", "active"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo eliminar"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        email: string | null;
        phone: string | null;
        color: string;
        commission_percentage: number | null;
        payment_mode: PaymentMode;
        salary_amount: number | null;
        notes: string | null;
        is_active: boolean;
        avatar_url: string | null;
      };
    }) => {
      const { error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees", "active"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo guardar"),
  });

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setIsCreating(false);
    setPendingAvatarUri(null);
    setRemoveAvatar(false);
    setForm({
      name: emp.name,
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      color: emp.color || config.theme.primaryColor,
      commission_percentage:
        emp.commission_percentage != null
          ? String(emp.commission_percentage)
          : String(config.commissions.defaultStaffPercent),
      paymentMode: emp.payment_mode ?? "commission",
      salary_amount: emp.salary_amount != null ? String(emp.salary_amount) : "",
      notes: emp.notes ?? "",
      is_active: emp.is_active,
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openCreate = () => {
    setEditing(null);
    setIsCreating(true);
    setPendingAvatarUri(null);
    setRemoveAvatar(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      color: config.theme.primaryColor,
      paymentMode: "commission" as PaymentMode,
      commission_percentage: String(config.commissions.defaultStaffPercent),
      salary_amount: "",
      notes: "",
      is_active: true,
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
    setIsCreating(false);
    setPendingAvatarUri(null);
    setRemoveAvatar(false);
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert(
      `Eliminar ${staffSingular}`,
      `¿Eliminar a ${editing.name}? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteMutation.mutate(editing),
        },
      ],
    );
  };

  const elegirFotoGaleria = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permiso",
        "Necesitamos acceso a la galería para elegir la foto.",
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    const asset = res.assets[0];
    setPendingAvatarUri(asset.uri);
    setRemoveAvatar(false);
    ultimoMimeAvatarRef.current = asset.mimeType ?? "image/jpeg";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const tomarFotoCamara = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permiso",
        "Necesitamos acceso a la cámara para tomar la foto.",
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    const asset = res.assets[0];
    setPendingAvatarUri(asset.uri);
    setRemoveAvatar(false);
    ultimoMimeAvatarRef.current = asset.mimeType ?? "image/jpeg";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const previewAvatarUri =
    removeAvatar || !editing
      ? null
      : pendingAvatarUri ??
        (editing.avatar_url?.trim() ? editing.avatar_url.trim() : null);

  const handleSave = async () => {
    if (!isCreating && !editing) return;
    const name = form.name.trim();
    if (!name) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }

    let commissionPercentage: number | null = null;
    if (form.paymentMode !== "salary") {
      const commission = parseInt(form.commission_percentage, 10);
      if (Number.isNaN(commission) || commission < 0 || commission > 100) {
        Alert.alert("Error", "La comisión debe ser un número entre 0 y 100");
        return;
      }
      commissionPercentage = commission;
    }

    let salaryAmount: number | null = null;
    if (form.paymentMode !== "commission") {
      const raw = form.salary_amount.trim().replace(",", ".");
      const parsed = raw ? parseFloat(raw) : NaN;
      if (Number.isNaN(parsed) || parsed < 0) {
        Alert.alert("Error", "Ingresa un salario válido (>= 0)");
        return;
      }
      salaryAmount = parsed;
    }

    const sharedData = {
      name,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      color: form.color.trim() || config.theme.primaryColor,
      commission_percentage: commissionPercentage,
      payment_mode: form.paymentMode,
      salary_amount: form.paymentMode !== "commission" ? salaryAmount : null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    if (isCreating) {
      let avatar_url: string | null = null;
      if (pendingAvatarUri) {
        try {
          const tempId = `temp_${Date.now()}`;
          const { publicUrl } = await subirAvatarEmpleadoDefault(
            tempId,
            pendingAvatarUri,
            ultimoMimeAvatarRef.current,
          );
          avatar_url = publicUrl;
        } catch (e) {
          Alert.alert(
            "Error al subir la foto",
            e instanceof Error ? e.message : "Intenta de nuevo.",
          );
          return;
        }
      }
      createMutation.mutate({ ...sharedData, avatar_url });
      return;
    }

    if (!editing) return;

    let avatar_url: string | null = editing.avatar_url?.trim() || null;
    if (removeAvatar) {
      try {
        await borrarAvatarSiEsStorage(supabase, editing.avatar_url);
      } catch {
        /* ignorar fallo de borrado en Storage */
      }
      avatar_url = null;
    } else if (pendingAvatarUri) {
      try {
        await borrarAvatarSiEsStorage(supabase, editing.avatar_url);
        const { publicUrl } = await subirAvatarEmpleadoDefault(
          editing.id,
          pendingAvatarUri,
          ultimoMimeAvatarRef.current,
        );
        avatar_url = publicUrl;
      } catch (e) {
        Alert.alert(
          "Error al subir la foto",
          e instanceof Error ? e.message : "Intenta de nuevo.",
        );
        return;
      }
    }

    updateMutation.mutate({
      id: editing.id,
      data: { ...sharedData, avatar_url },
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
          Toca a una {staffSingular.toLowerCase()} para editar datos, modo de pago
          y foto para la agenda.
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
              <View
                style={[
                  styles.cardAvatarWrap,
                  { borderColor: emp.color, backgroundColor: theme.backgroundSecondary },
                ]}
              >
                {emp.avatar_url?.trim() ? (
                  <Image
                    source={{ uri: emp.avatar_url.trim() }}
                    style={styles.cardAvatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <ThemedText
                    style={[styles.cardAvatarLetter, { color: emp.color }]}
                  >
                    {(emp.name?.trim().split(/\s+/)[0] ?? "?").slice(0, 1).toUpperCase()}
                  </ThemedText>
                )}
              </View>
              <View style={styles.cardMain}>
                <View style={styles.nameRow}>
                  <ThemedText style={styles.cardName}>{emp.name}</ThemedText>
                  <EmployeePaymentBadge
                    mode={emp.payment_mode ?? "commission"}
                    percentage={
                      emp.payment_mode === "salary"
                        ? null
                        : emp.commission_percentage
                    }
                  />
                </View>
                {emp.email ? (
                  <ThemedText
                    style={[styles.cardEmail, { color: theme.textMuted }]}
                  >
                    {emp.email}
                  </ThemedText>
                ) : null}
                <View style={styles.badges}>
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

      {/* FAB agregar profesional */}
      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.lg }]}
        onPress={openCreate}
        hitSlop={8}
      >
        <Feather name="plus" size={26} color="#FFF" />
      </Pressable>

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
                {editing ? `Editar ${staffSingular}` : `Nuevo ${staffSingular}`}
              </ThemedText>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing["3xl"] }}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Foto (agenda y lista)
              </ThemedText>
              <View style={styles.avatarEditorRow}>
                <View
                  style={[
                    styles.avatarPreviewRing,
                    {
                      borderColor: editing?.color ?? theme.primary,
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  {previewAvatarUri ? (
                    <Image
                      source={{ uri: previewAvatarUri }}
                      style={styles.avatarPreviewImg}
                      contentFit="cover"
                    />
                  ) : (
                    <Feather name="user" size={36} color={theme.textMuted} />
                  )}
                </View>
                <View style={styles.avatarActions}>
                  <Pressable
                    style={[styles.avatarBtn, { borderColor: theme.border }]}
                    onPress={elegirFotoGaleria}
                  >
                    <Feather name="image" size={18} color={theme.primary} />
                    <ThemedText style={[styles.avatarBtnText, { color: theme.primary }]}>
                      Galería
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.avatarBtn, { borderColor: theme.border }]}
                    onPress={tomarFotoCamara}
                  >
                    <Feather name="camera" size={18} color={theme.primary} />
                    <ThemedText style={[styles.avatarBtnText, { color: theme.primary }]}>
                      Cámara
                    </ThemedText>
                  </Pressable>
                  {(editing?.avatar_url?.trim() || pendingAvatarUri) && !removeAvatar ? (
                    <Pressable
                      style={[styles.avatarBtn, { borderColor: theme.error }]}
                      onPress={() => {
                        setRemoveAvatar(true);
                        setPendingAvatarUri(null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Feather name="trash-2" size={18} color={theme.error} />
                      <ThemedText style={[styles.avatarBtnText, { color: theme.error }]}>
                        Quitar foto
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {removeAvatar ? (
                    <Pressable
                      onPress={() => {
                        setRemoveAvatar(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <ThemedText style={{ color: theme.link, fontSize: 13 }}>
                        Deshacer quitar foto
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </View>

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
                Correo
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
                placeholder="nombre@correo.com"
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
                placeholder="Ej. +1 555 123 4567"
                placeholderTextColor={theme.textMuted}
                value={form.phone}
                onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Modo de pago
              </ThemedText>
              <View style={styles.paymentModeRow}>
                {(
                  [
                    { id: "commission" as PaymentMode, label: "Comisión" },
                    { id: "salary" as PaymentMode, label: "Salario fijo" },
                    { id: "mixed" as PaymentMode, label: "Mixto" },
                  ] as const
                ).map((opt) => {
                  const selected = form.paymentMode === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.paymentModeChip,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected
                            ? theme.primary + "15"
                            : theme.backgroundSecondary,
                        },
                      ]}
                      onPress={() =>
                        setForm((f) => ({ ...f, paymentMode: opt.id }))
                      }
                    >
                      <ThemedText
                        style={[
                          styles.paymentModeChipText,
                          {
                            color: selected ? theme.primary : theme.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {form.paymentMode !== "salary" && (
                <>
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
                </>
              )}

              {form.paymentMode !== "commission" && (
                <>
                  <ThemedText
                    style={[styles.fieldLabel, { color: theme.textSecondary }]}
                  >
                    {`Salario fijo (${currencySymbol})`}
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
                    placeholder="800"
                    placeholderTextColor={theme.textMuted}
                    value={form.salary_amount}
                    onChangeText={(t) =>
                      setForm((f) => ({ ...f, salary_amount: t }))
                    }
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Color (hex)
              </ThemedText>
              <View style={styles.colorRow}>
                {presetColors.map((c) => (
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
                placeholder={config.theme.primaryColor}
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="#FFF" />
                    <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>
                  </>
                )}
              </Pressable>

              {!isCreating && editing && (
                <Pressable
                  style={[styles.deleteBtn, { borderColor: theme.error }]}
                  onPress={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator color={theme.error} />
                  ) : (
                    <>
                      <Feather name="trash-2" size={16} color={theme.error} />
                      <ThemedText style={[styles.deleteBtnText, { color: theme.error }]}>
                        Eliminar {staffSingular}
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              )}
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
  cardAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    marginRight: Spacing.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarImg: { width: "100%", height: "100%" },
  cardAvatarLetter: { fontSize: 20, fontWeight: "700" },
  cardMain: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "600", marginBottom: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
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
  avatarEditorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatarPreviewRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPreviewImg: { width: "100%", height: "100%" },
  avatarActions: { flex: 1, gap: Spacing.sm },
  avatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  avatarBtnText: { fontSize: 14, fontWeight: "600" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  paymentModeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  paymentModeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
  },
  paymentModeChipText: {
    fontSize: 13,
    fontWeight: "600",
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  deleteBtnText: { fontSize: 15, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    bottom: Spacing["3xl"],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
