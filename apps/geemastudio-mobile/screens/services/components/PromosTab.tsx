import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { Spacing, Shadows } from "@/constants/theme";

import { usePromosData } from "../hooks/usePromosData";
import type { PromoSavePayload } from "../hooks/usePromosData";
import { usePacksData } from "../hooks/usePacksData";
import { useServicesData } from "../hooks/useServicesData";
import type { Promo } from "../types";
import { PromoCard } from "./PromoCard";
import { PromoModal } from "./PromoModal";

export function PromosTab() {
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();

  const { services } = useServicesData();
  const { packs } = usePacksData();
  const {
    promotions,
    promotionItems,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
  } = usePromosData();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [toggleLoading, setToggleLoading] = useState<Record<string, boolean>>(
    {},
  );

  const openNew = useCallback(() => {
    setEditing(null);
    setModalVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const openEdit = useCallback((p: Promo) => {
    setEditing(p);
    setModalVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditing(null);
  }, []);

  const handleSave = useCallback(
    (payload: PromoSavePayload) => {
      if (editing) {
        updateMutation.mutate(
          { id: editing.id, payload },
          {
            onSuccess: () => {
              closeModal();
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            },
            onError: (e: Error) =>
              Alert.alert("Error", e.message ?? "No se pudo guardar"),
          },
        );
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            closeModal();
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
          },
          onError: (e: Error) =>
            Alert.alert("Error", e.message ?? "No se pudo crear"),
        });
      }
    },
    [editing, updateMutation, createMutation, closeModal],
  );

  const handleDelete = useCallback(
    (p: Promo) => {
      Alert.alert(
        "Eliminar promo",
        `¿Seguro que querés eliminar "${p.title}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => deleteMutation.mutate(p.id),
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleToggle = useCallback(
    async (p: Promo) => {
      if (toggleLoading[p.id]) {
        return;
      }
      setToggleLoading((prev) => ({ ...prev, [p.id]: true }));
      try {
        await toggleActiveMutation.mutateAsync({
          id: p.id,
          is_active: !p.is_active,
        });
      } catch (e) {
        Alert.alert(
          "Error",
          e instanceof Error ? e.message : "No se pudo actualizar",
        );
      } finally {
        setToggleLoading((prev) => {
          const n = { ...prev };
          delete n[p.id];
          return n;
        });
      }
    },
    [toggleActiveMutation, toggleLoading],
  );

  const savePending = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText
              style={[
                styles.emptySub,
                { color: theme.textMuted, marginTop: 16 },
              ]}
            >
              Cargando promos…
            </ThemedText>
          </View>
        ) : isError ? (
          <View style={styles.empty}>
            <Feather name="wifi-off" size={48} color={theme.error} />
            <ThemedText style={[styles.emptyTitle, { color: theme.error }]}>
              Error de conexión
            </ThemedText>
          </View>
        ) : promotions.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="percent" size={40} color={theme.textMuted} />
            <ThemedText
              style={[styles.emptyTitle, { color: theme.textSecondary }]}
            >
              No hay promos
            </ThemedText>
            <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
              Armá combos con precio rebajado
            </ThemedText>
          </View>
        ) : (
          promotions.map((promo) => (
            <PromoCard
              key={promo.id}
              promo={promo}
              onPress={() => openEdit(promo)}
              onLongPress={() => handleDelete(promo)}
              onToggleActive={() => handleToggle(promo)}
              isToggling={!!toggleLoading[promo.id]}
              theme={theme}
              config={config}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.fab,
          { backgroundColor: config.theme.primaryColor },
          Shadows.lg,
        ]}
        onPress={openNew}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      <PromoModal
        visible={modalVisible}
        onClose={closeModal}
        editing={editing}
        promotionItems={promotionItems}
        services={services}
        packs={packs}
        onSave={handleSave}
        savePending={savePending}
        onDelete={handleDelete}
        deletePending={deleteMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  empty: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySub: { fontSize: 14 },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
