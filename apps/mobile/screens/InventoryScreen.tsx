import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

type InventoryCategory = "unas" | "pestanas_cejas" | "insumos";

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  category: InventoryCategory;
  quantity: number;
  min_stock: number;
  unit: string;
  price: string | null;
  cost: string | null;
}

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  unas: "Uñas",
  pestanas_cejas: "Pestañas y Cejas",
  insumos: "Insumos",
};

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();
  const currencySymbol = config.locale.currency.symbol;
  const { isAdmin } = useAuth();

  const [selectedTab, setSelectedTab] = useState<InventoryCategory>("unas");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "unas" as InventoryCategory,
    quantity: "0",
    minStock: "5",
    unit: "unidad",
    cost: "",
  });

  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/inventory/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const adjustQuantityMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const res = await apiRequest("PATCH", `/api/inventory/${id}/quantity`, {
        delta,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const openNewItem = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: selectedTab,
      quantity: "0",
      minStock: "5",
      unit: "unidad",
      cost: "",
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      minStock: item.min_stock.toString(),
      unit: item.unit,
      cost: item.cost ?? "",
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Ingresa el nombre del producto");
      return;
    }

    const data = {
      name: formData.name,
      category: formData.category,
      quantity: parseInt(formData.quantity),
      min_stock: parseInt(formData.minStock),
      unit: formData.unit,
      cost: formData.cost ? parseFloat(formData.cost) : null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert("Eliminar Producto", `¿Eliminar "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const filteredItems = items.filter((item) => item.category === selectedTab);

  const ItemCard = ({ item }: { item: InventoryItem }) => {
    const isLowStock = item.quantity <= item.min_stock;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.itemCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isLowStock ? Colors.light.warning : theme.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => openEditItem(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <ThemedText style={styles.itemName}>{item.name}</ThemedText>
            {isLowStock && (
              <View
                style={[
                  styles.warningBadge,
                  { backgroundColor: Colors.light.warning + "20" },
                ]}
              >
                <Feather
                  name="alert-triangle"
                  size={12}
                  color={Colors.light.warning}
                />
              </View>
            )}
          </View>
          <ThemedText style={[styles.itemUnit, { color: theme.textMuted }]}>
            {item.unit}
          </ThemedText>
        </View>

        <View style={styles.quantityControls}>
          <Pressable
            style={[styles.quantityButton, { borderColor: theme.border }]}
            onPress={() =>
              adjustQuantityMutation.mutate({ id: item.id, delta: -1 })
            }
          >
            <Feather name="minus" size={18} color={theme.text} />
          </Pressable>
          <ThemedText
            style={[
              styles.quantityText,
              isLowStock && { color: Colors.light.warning },
            ]}
          >
            {item.quantity}
          </ThemedText>
          <Pressable
            style={[styles.quantityButton, { borderColor: theme.border }]}
            onPress={() =>
              adjustQuantityMutation.mutate({ id: item.id, delta: 1 })
            }
          >
            <Feather name="plus" size={18} color={theme.text} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // Solo admins (dev/owner) pueden ver y gestionar inventario.
  if (!isAdmin) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: Spacing.lg,
          }}
        >
          <Feather
            name="lock"
            size={32}
            color={theme.textMuted}
            style={{ marginBottom: Spacing.md }}
          />
          <ThemedText
            style={{ fontSize: 16, textAlign: "center", color: theme.text }}
          >
            El inventario solo se maneja desde administración.
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 13,
              textAlign: "center",
              marginTop: Spacing.sm,
              color: theme.textSecondary,
            }}
          >
            Cualquier ajuste de productos o insumos se coordina con la dueña.
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.tabBar, { paddingTop: headerHeight + Spacing.sm }]}>
        {(["unas", "pestanas_cejas", "insumos"] as InventoryCategory[]).map(
          (cat) => (
            <Pressable
              key={cat}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    selectedTab === cat
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
              onPress={() => {
                setSelectedTab(cat);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { color: selectedTab === cat ? "#FFFFFF" : theme.text },
                ]}
              >
                {CATEGORY_LABELS[cat]}
              </ThemedText>
            </Pressable>
          ),
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 70,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.light.violet}
          />
        }
      >
        {filteredItems.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Image
              source={require("../assets/images/empty-inventory.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <ThemedText
              style={[styles.emptyTitle, { color: theme.textSecondary }]}
            >
              Inventario vacío
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textMuted }]}
            >
              Agrega ítems de {CATEGORY_LABELS[selectedTab].toLowerCase()}
            </ThemedText>
          </View>
        ) : (
          filteredItems.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: Colors.light.violet }]}
        onPress={openNewItem}
      >
        <Feather name="plus" size={24} color={Colors.light.white} />
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
                {editingItem ? "Editar Producto" : "Nuevo Producto"}
              </ThemedText>
              <Pressable onPress={closeModal}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ThemedText
              style={[styles.inputLabel, { color: theme.textSecondary }]}
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
              placeholder="Nombre del producto"
              placeholderTextColor={theme.textMuted}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <ThemedText
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
                >
                  Cantidad
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
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  value={formData.quantity}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, quantity: text }))
                  }
                />
              </View>
              <View style={styles.halfInput}>
                <ThemedText
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
                >
                  Stock Mínimo
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
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  value={formData.minStock}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, minStock: text }))
                  }
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <ThemedText
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
                >
                  Unidad
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
                  placeholder="unidad, caja..."
                  placeholderTextColor={theme.textMuted}
                  value={formData.unit}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, unit: text }))
                  }
                />
              </View>
              <View style={styles.halfInput}>
                <ThemedText
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
                >
                  {`Costo (${currencySymbol})`}
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
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={formData.cost}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, cost: text }))
                  }
                />
              </View>
            </View>

            <ThemedText
              style={[styles.inputLabel, { color: theme.textSecondary }]}
            >
              Categoría
            </ThemedText>
            <View style={[styles.row, { marginBottom: 0 }]}>
              {(["unas", "pestanas_cejas", "insumos"] as InventoryCategory[]).map(
                (cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          formData.category === cat
                            ? theme.primary
                            : theme.backgroundSecondary,
                        borderColor:
                          formData.category === cat
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, category: cat }))
                    }
                  >
                    <ThemedText
                      style={[
                        styles.categoryChipText,
                        {
                          color:
                            formData.category === cat ? "#FFFFFF" : theme.text,
                        },
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </ThemedText>
                  </Pressable>
                ),
              )}
            </View>

            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: Colors.light.violet },
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  {editingItem ? "Guardar" : "Agregar"}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  warningBadge: {
    padding: 4,
    borderRadius: BorderRadius.xs,
  },
  itemUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  inputLabel: {
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
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing["2xl"],
  },
  submitButtonText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: "600",
  },
  categoryChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
