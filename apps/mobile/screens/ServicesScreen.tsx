import React, { useState, useMemo } from "react";
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

interface Service {
  id: string;
  name: string;
  category_id: string;
  price: string;
  duration: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  order: number;
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();
  const currencySymbol = config.locale.currency.symbol;

  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    price: "",
    duration: "60",
  });

  const {
    data: services = [],
    isLoading,
    refetch,
    error: servicesError,
  } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: categories = [], error: categoriesError } = useQuery<
    Category[]
  >({
    queryKey: ["/api/service-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "No se pudo crear el servicio");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert(
        "No se pudo eliminar",
        error.message || "El servicio puede estar en uso (citas asociadas).",
      );
    },
  });

  const openNewService = () => {
    setEditingService(null);
    setFormData({
      name: "",
      categoryId: categories[0]?.id || "",
      price: "",
      duration: "60",
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      categoryId: service.category_id,
      price: service.price,
      duration: service.duration.toString(),
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingService(null);
    setFormData({ name: "", categoryId: "", price: "", duration: "60" });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    const data = {
      name: formData.name,
      category_id: formData.categoryId,
      price: formData.price,
      duration: parseInt(formData.duration),
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      "Eliminar Servicio",
      `¿Estás segura de eliminar "${service.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteMutation.mutate(service.id),
        },
      ],
    );
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Sin categoría";
  };

  const groupedServices = useMemo(() => {
    const groups = categories.map((category) => ({
      ...category,
      services: services.filter((s) => s.category_id === category.id),
    }));
    if (filterCategoryId) {
      return groups.filter((g) => g.id === filterCategoryId);
    }
    return groups;
  }, [categories, services, filterCategoryId]);

  const ServiceCard = ({ service }: { service: Service }) => (
    <Pressable
      style={({ pressed }) => [
        styles.serviceCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={() => openEditService(service)}
      onLongPress={() => handleDelete(service)}
    >
      <View style={styles.serviceInfo}>
        <ThemedText style={styles.serviceName}>{service.name}</ThemedText>
        <View style={styles.serviceDetails}>
          <Feather name="clock" size={12} color={theme.textMuted} />
          <ThemedText style={[styles.detailText, { color: theme.textMuted }]}>
            {service.duration} min
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.servicePrice, { color: Colors.light.gold }]}>
        {currencySymbol}{parseFloat(service.price).toFixed(0)}
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[styles.filterBar, { paddingTop: headerHeight + Spacing.sm }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: theme.border },
              !filterCategoryId && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setFilterCategoryId(null)}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                { color: !filterCategoryId ? "#FFFFFF" : theme.text },
              ]}
            >
              Todas
            </ThemedText>
          </Pressable>
          {categories.map((cat) => {
            const isSelected = filterCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterChip,
                  { borderColor: theme.border },
                  isSelected && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setFilterCategoryId(cat.id)}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {cat.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: Spacing.md,
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
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.light.violet} />
            <ThemedText
              style={[
                styles.emptySubtitle,
                { color: theme.textMuted, marginTop: Spacing.lg },
              ]}
            >
              Cargando servicios...
            </ThemedText>
          </View>
        ) : servicesError || categoriesError ? (
          <View style={styles.emptyState}>
            <Feather name="wifi-off" size={48} color={theme.error} />
            <ThemedText
              style={[
                styles.emptyTitle,
                { color: theme.error, marginTop: Spacing.lg },
              ]}
            >
              Error de conexión
            </ThemedText>
            <ThemedText
              style={[
                styles.emptySubtitle,
                {
                  color: theme.textMuted,
                  textAlign: "center",
                  paddingHorizontal: Spacing.xl,
                },
              ]}
            >
              No se pudieron cargar los servicios. Verifica que el servidor esté
              activo y desliza hacia abajo para reintentar.
            </ThemedText>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={require("../assets/images/empty-services.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <ThemedText
              style={[styles.emptyTitle, { color: theme.textSecondary }]}
            >
              No hay servicios
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textMuted }]}
            >
              Agrega tu primer servicio
            </ThemedText>
          </View>
        ) : (
          groupedServices.map(
            (category) =>
              category.services.length > 0 && (
                <View key={category.id} style={styles.categorySection}>
                  <ThemedText
                    style={[
                      styles.categoryTitle,
                      { color: Colors.light.violet },
                    ]}
                  >
                    {category.name}
                  </ThemedText>
                  {category.services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </View>
              ),
          )
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: Colors.light.violet }]}
        onPress={openNewService}
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
                {editingService ? "Editar Servicio" : "Nuevo Servicio"}
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
              placeholder="Nombre del servicio"
              placeholderTextColor={theme.textMuted}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
            />

            <ThemedText
              style={[styles.inputLabel, { color: theme.textSecondary }]}
            >
              Categoría
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScroll}
            >
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.optionChip,
                    formData.categoryId === category.id && {
                      backgroundColor: Colors.light.violet,
                      borderColor: Colors.light.violet,
                    },
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: category.id,
                    }))
                  }
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      formData.categoryId === category.id && {
                        color: Colors.light.white,
                      },
                    ]}
                  >
                    {category.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <ThemedText
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
                >
                  {`Precio (${currencySymbol})`}
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
                  value={formData.price}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, price: text }))
                  }
                />
              </View>
              <View style={styles.halfInput}>
                <ThemedText
                  style={[styles.inputLabel, { color: theme.textSecondary }]}
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
                  value={formData.duration}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, duration: text }))
                  }
                />
              </View>
            </View>

            {editingService && (
              <Pressable
                style={[styles.deleteButton, { borderColor: theme.error }]}
                onPress={() => {
                  closeModal();
                  handleDelete(editingService);
                }}
                disabled={deleteMutation.isPending}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
                <ThemedText
                  style={[styles.deleteButtonText, { color: theme.error }]}
                >
                  Eliminar servicio
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color={Colors.light.white} />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  {editingService ? "Guardar" : "Crear Servicio"}
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
  filterBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  filterChips: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterChipText: {
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
  categorySection: {
    marginBottom: Spacing.xl,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  serviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "700",
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
  optionsScroll: {
    flexGrow: 0,
  },
  optionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: Spacing.sm,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  submitButtonText: {
    color: Colors.light.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
