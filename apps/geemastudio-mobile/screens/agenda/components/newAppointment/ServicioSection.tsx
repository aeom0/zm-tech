import React from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import type {
  AgendaFormState,
  AgendaService,
  AgendaServiceCategory,
} from "../../types";
import { agendaStyles as styles } from "../../agendaStyles";
import type { NewAppointmentModalTheme } from "./modalTheme";

interface ServicioSectionProps {
  theme: NewAppointmentModalTheme;
  currencySymbol: string;
  formData: AgendaFormState;
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>;
  servicesByCategory: AgendaService[];
  selectedCategory: AgendaServiceCategory | undefined;
  servicesLoading: boolean;
  servicesError: unknown;
}

export function ServicioSection({
  theme,
  currencySymbol,
  formData,
  setFormData,
  servicesByCategory,
  selectedCategory,
  servicesLoading,
  servicesError,
}: ServicioSectionProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.sectionHeader}>
        <Feather name="list" size={16} color={theme.primary} />
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Servicio
        </ThemedText>
      </View>

      {servicesLoading ? (
        <ActivityIndicator
          color={theme.primary}
          style={{ padding: Spacing.lg }}
        />
      ) : servicesError ? (
        <View
          style={[styles.emptyState, { backgroundColor: theme.error + "15" }]}
        >
          <Feather name="wifi-off" size={20} color={theme.error} />
          <ThemedText style={[styles.emptyText, { color: theme.error }]}>
            Error al cargar servicios.
          </ThemedText>
        </View>
      ) : !formData.categoryId ? (
        <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
          Elige primero una categoría.
        </ThemedText>
      ) : servicesByCategory.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
          No hay servicios en {selectedCategory?.name}.
        </ThemedText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {servicesByCategory.map((service) => {
            const isSelected = formData.serviceId === service.id;
            return (
              <Pressable
                key={service.id}
                style={[
                  styles.serviceChip,
                  { borderColor: theme.border },
                  isSelected && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceId: service.id,
                  }))
                }
              >
                <ThemedText
                  style={[
                    styles.serviceChipName,
                    isSelected && { color: "#FFFFFF" },
                  ]}
                  numberOfLines={1}
                >
                  {service.name}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.serviceChipDetail,
                    {
                      color: isSelected
                        ? "rgba(255,255,255,0.8)"
                        : theme.textMuted,
                    },
                  ]}
                >
                  {currencySymbol} {service.price} · {service.duration} min
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
