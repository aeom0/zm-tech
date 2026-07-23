import React, { useEffect, useMemo, useState } from "react";
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
import { formatCurrency } from "@/utils/format";

import type { Pack, Promo, PromotionItem, Service } from "../types";
import type { PromoItemDraft, PromoSavePayload } from "../hooks/usePromosData";
import { parsePriceInput, priceToDecimalString } from "../types";

const TITLE_MAX = 24;
const DESC_MAX = 72;
const BADGE_PRESETS = ["✨", "🎁", "💅", "🔥", "⭐", "💫"];

interface PromoModalProps {
  visible: boolean;
  onClose: () => void;
  editing: Promo | null;
  promotionItems: PromotionItem[];
  services: Service[];
  packs: Pack[];
  onSave: (payload: PromoSavePayload) => void;
  savePending: boolean;
  onDelete: (p: Promo) => void;
  deletePending: boolean;
}

function newTempId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function expiresToInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function inputToExpiresIso(yyyyMmDd: string): string | null {
  const t = yyyyMmDd.trim();
  if (!t) {
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) {
    return null;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d, 23, 59, 59);
  return dt.toISOString();
}

export function PromoModal({
  visible,
  onClose,
  editing,
  promotionItems,
  services,
  packs,
  onSave,
  savePending,
  onDelete,
  deletePending,
}: PromoModalProps) {
  const { theme } = useTheme();
  const { config } = useTenant();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [badge, setBadge] = useState("✨");
  const [accentColor, setAccentColor] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [expiresInput, setExpiresInput] = useState("");
  const [items, setItems] = useState<PromoItemDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editing) {
      setTitle(editing.title.slice(0, TITLE_MAX));
      setDescription((editing.description ?? "").slice(0, DESC_MAX));
      setBadge(editing.badge?.trim() || "✨");
      setAccentColor(editing.accent_color?.trim() ?? "");
      setIsActive(editing.is_active);
      setExpiresInput(expiresToInput(editing.expires_at));
      const lines = promotionItems
        .filter((pi) => pi.promo_id === editing.id)
        .map((pi) => ({
          tempId: pi.id,
          item_type: pi.item_type,
          item_id: pi.item_id,
          quantity: pi.quantity > 0 ? pi.quantity : 1,
          discounted_price: priceToDecimalString(pi.discounted_price),
        }));
      setItems(lines);
    } else {
      setTitle("");
      setDescription("");
      setBadge("✨");
      setAccentColor("");
      setIsActive(true);
      setExpiresInput("");
      setItems([]);
    }
  }, [visible, editing, promotionItems]);

  const computedTotal = useMemo(() => {
    let total = 0;
    for (const line of items) {
      const unit = parsePriceInput(line.discounted_price);
      const qty = line.quantity > 0 ? line.quantity : 1;
      total += unit * qty;
    }
    return total;
  }, [items]);

  const serviceById = useMemo(
    () => Object.fromEntries(services.map((s) => [s.id, s])),
    [services],
  );
  const packById = useMemo(
    () => Object.fromEntries(packs.map((p) => [p.id, p])),
    [packs],
  );

  const updateLine = (
    tempId: string,
    patch: Partial<Pick<PromoItemDraft, "quantity" | "discounted_price">>,
  ) => {
    setItems((prev) =>
      prev.map((row) => (row.tempId === tempId ? { ...row, ...patch } : row)),
    );
  };

  const removeLine = (tempId: string) => {
    setItems((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const addLine = (item_type: "service" | "pack", item_id: string) => {
    if (items.some((i) => i.item_type === item_type && i.item_id === item_id)) {
      Alert.alert("Duplicado", "Ese ítem ya está en la promo.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        tempId: newTempId(),
        item_type,
        item_id,
        quantity: 1,
        discounted_price: "0",
      },
    ]);
    setPickerOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    const t = title.trim();
    if (!t) {
      Alert.alert("Título", "El título es obligatorio.");
      return;
    }
    if (t.length > TITLE_MAX) {
      Alert.alert("Título", `Máximo ${TITLE_MAX} caracteres (Meta WABA).`);
      return;
    }
    if (description.trim().length > DESC_MAX) {
      Alert.alert("Descripción", `Máximo ${DESC_MAX} caracteres (Meta WABA).`);
      return;
    }
    if (items.length === 0) {
      Alert.alert("Ítems", "Agrega al menos un servicio o pack.");
      return;
    }
    const expires_at = inputToExpiresIso(expiresInput);
    if (expiresInput.trim() && !expires_at) {
      Alert.alert(
        "Vencimiento",
        "Usa formato AAAA-MM-DD o deja vacío si no aplica.",
      );
      return;
    }
    const payload: PromoSavePayload = {
      title: t.slice(0, TITLE_MAX),
      description: description.trim()
        ? description.trim().slice(0, DESC_MAX)
        : null,
      badge: badge.trim() || null,
      accent_color: accentColor.trim() || null,
      is_active: isActive,
      expires_at,
      items,
    };
    onSave(payload);
  };

  const labelFor = (line: PromoItemDraft): string => {
    if (line.item_type === "service") {
      return serviceById[line.item_id]?.name ?? "Servicio";
    }
    return packById[line.item_id]?.name ?? "Pack";
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View
            style={[styles.sheet, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.header}>
              <ThemedText style={styles.title}>
                {editing ? "Editar promo" : "Nueva promo"}
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
              <View style={styles.counterRow}>
                <ThemedText
                  style={[styles.label, { color: theme.textSecondary }]}
                >
                  Título
                </ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                  {title.length}/{TITLE_MAX}
                </ThemedText>
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
                placeholder="Nombre corto de la promo"
                placeholderTextColor={theme.textMuted}
                value={title}
                maxLength={TITLE_MAX}
                onChangeText={setTitle}
              />

              <View style={styles.counterRow}>
                <ThemedText
                  style={[styles.label, { color: theme.textSecondary }]}
                >
                  Descripción
                </ThemedText>
                <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>
                  {description.length}/{DESC_MAX}
                </ThemedText>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Detalle para el cliente"
                placeholderTextColor={theme.textMuted}
                value={description}
                maxLength={DESC_MAX}
                onChangeText={setDescription}
                multiline
              />

              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Badge
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.presets}
              >
                {BADGE_PRESETS.map((em) => (
                  <Pressable
                    key={em}
                    style={[
                      styles.presetChip,
                      {
                        borderColor: theme.border,
                        backgroundColor:
                          badge === em ? theme.primary + "22" : "transparent",
                      },
                    ]}
                    onPress={() => setBadge(em)}
                  >
                    <ThemedText style={{ fontSize: 22 }}>{em}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="O escribe un emoji o texto corto"
                placeholderTextColor={theme.textMuted}
                value={badge}
                onChangeText={setBadge}
                maxLength={8}
              />

              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Color de acento (hex, opcional)
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
                placeholder="#40E0D0"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                value={accentColor}
                onChangeText={setAccentColor}
              />

              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Precio promo (calculado)
              </ThemedText>
              <ThemedText style={[styles.totalText, { color: theme.accent }]}>
                {formatCurrency(computedTotal, config)}
              </ThemedText>

              <View style={styles.itemsHeader}>
                <ThemedText
                  style={[styles.label, { color: theme.textSecondary }]}
                >
                  Ítems de la promo
                </ThemedText>
                <Pressable
                  style={[styles.addBtn, { borderColor: theme.primary }]}
                  onPress={() => setPickerOpen(true)}
                >
                  <Feather name="plus" size={16} color={theme.primary} />
                  <ThemedText
                    style={{ color: theme.primary, fontWeight: "600" }}
                  >
                    Agregar
                  </ThemedText>
                </Pressable>
              </View>

              {items.map((line) => (
                <View
                  key={line.tempId}
                  style={[styles.itemCard, { borderColor: theme.border }]}
                >
                  <View style={styles.itemTop}>
                    <ThemedText style={styles.itemTitle} numberOfLines={1}>
                      {line.item_type === "service" ? "Servicio" : "Pack"} ·{" "}
                      {labelFor(line)}
                    </ThemedText>
                    <Pressable onPress={() => removeLine(line.tempId)}>
                      <Feather name="trash-2" size={18} color={theme.error} />
                    </Pressable>
                  </View>
                  <View style={styles.itemRow}>
                    <View style={styles.miniField}>
                      <ThemedText
                        style={{ color: theme.textMuted, fontSize: 12 }}
                      >
                        Cantidad
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.miniInput,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                        keyboardType="number-pad"
                        value={String(line.quantity)}
                        onChangeText={(txt) => {
                          const q = parseInt(txt.replace(/\D/g, ""), 10);
                          updateLine(line.tempId, {
                            quantity: Number.isFinite(q) && q > 0 ? q : 1,
                          });
                        }}
                      />
                    </View>
                    <View style={styles.miniField}>
                      <ThemedText
                        style={{ color: theme.textMuted, fontSize: 12 }}
                      >
                        Precio rebajado ({config.locale.currency.symbol})
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.miniInput,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                        keyboardType="decimal-pad"
                        value={line.discounted_price}
                        onChangeText={(txt) =>
                          updateLine(line.tempId, { discounted_price: txt })
                        }
                      />
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.switchRow}>
                <ThemedText style={{ color: theme.text }}>
                  Promo activa
                </ThemedText>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{
                    false: theme.border,
                    true: theme.primary + "99",
                  }}
                  thumbColor={isActive ? theme.primary : theme.textMuted}
                />
              </View>

              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Vence (AAAA-MM-DD, opcional)
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
                placeholder="2026-12-31"
                placeholderTextColor={theme.textMuted}
                value={expiresInput}
                onChangeText={setExpiresInput}
                autoCapitalize="none"
              />

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
                    Eliminar promo
                  </ThemedText>
                </Pressable>
              )}

              <Pressable
                style={[styles.submit, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
                disabled={savePending}
              >
                {savePending ? (
                  <ActivityIndicator color={Colors.light.white} />
                ) : (
                  <ThemedText style={styles.submitText}>
                    {editing ? "Guardar" : "Crear promo"}
                  </ThemedText>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerOpen} animationType="fade" transparent>
        <View style={styles.pickerOverlay}>
          <View
            style={[
              styles.pickerSheet,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.pickerHeader}>
              <ThemedText style={styles.title}>Agregar ítem</ThemedText>
              <Pressable onPress={() => setPickerOpen(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView>
              <ThemedText
                style={[styles.pickerSection, { color: theme.primary }]}
              >
                Servicios
              </ThemedText>
              {services.map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.pickerRow}
                  onPress={() => addLine("service", s.id)}
                >
                  <ThemedText>{s.name}</ThemedText>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.textMuted}
                  />
                </Pressable>
              ))}
              <ThemedText
                style={[styles.pickerSection, { color: theme.primary }]}
              >
                Packs
              </ThemedText>
              {packs.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.pickerRow}
                  onPress={() => addLine("pack", p.id)}
                >
                  <ThemedText>{p.name}</ThemedText>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.textMuted}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
    maxHeight: "94%",
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
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  input: {
    minHeight: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  textArea: {
    minHeight: 88,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  presets: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
  },
  presetChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  totalText: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  itemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  itemRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  miniField: {
    flex: 1,
  },
  miniInput: {
    marginTop: 4,
    height: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    maxHeight: "70%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  pickerSection: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
});
