import React from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import type {
  AgendaEmployee,
  AgendaFormState,
  AgendaService,
  AgendaServiceCategory,
} from "../types";
import { agendaStyles as styles } from "../agendaStyles";
import { CategoriaSection } from "./newAppointment/CategoriaSection";
import { ClienteSection } from "./newAppointment/ClienteSection";
import type { NewAppointmentModalTheme } from "./newAppointment/modalTheme";
import { ServicioSection } from "./newAppointment/ServicioSection";
import { StaffSection } from "./newAppointment/StaffSection";
import { SummaryCard } from "./newAppointment/SummaryCard";

export type { NewAppointmentModalTheme };

interface NewAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  isTablet: boolean;
  theme: NewAppointmentModalTheme;
  currencySymbol: string;
  selectedDate: Date;
  selectedHour: number;
  formData: AgendaFormState;
  setFormData: React.Dispatch<React.SetStateAction<AgendaFormState>>;
  categories: AgendaServiceCategory[];
  services: AgendaService[];
  servicesByCategory: AgendaService[];
  selectedCategory: AgendaServiceCategory | undefined;
  servicesLoading: boolean;
  servicesError: unknown;
  employeesLoading: boolean;
  employeesError: unknown;
  employees: AgendaEmployee[];
  selectedService: AgendaService | undefined;
  selectedEmployee: AgendaEmployee | undefined;
  formatDateLabel: (d: Date) => string;
  onSubmit: () => void;
  createPending: boolean;
  availabilityStatus?: "idle" | "checking" | "free" | "busy" | "error";
  busyUntilLabel?: string | null;
  isBusy?: boolean;
  staffSingular: string;
  staffPlural: string;
  /** p. ej. terminology.client — "clienta" / "cliente" */
  clientLabel: string;
}

export function NewAppointmentModal({
  visible,
  onClose,
  isTablet,
  theme,
  currencySymbol,
  selectedDate,
  selectedHour,
  formData,
  setFormData,
  categories,
  services,
  servicesByCategory,
  selectedCategory,
  servicesLoading,
  servicesError,
  employeesLoading,
  employeesError,
  employees,
  selectedService,
  selectedEmployee,
  formatDateLabel,
  onSubmit,
  createPending,
  availabilityStatus = "idle",
  busyUntilLabel = null,
  isBusy = false,
  staffSingular,
  staffPlural,
  clientLabel,
}: NewAppointmentModalProps) {
  const clientSectionTitle =
    clientLabel.charAt(0).toUpperCase() + clientLabel.slice(1);

  const disableSubmit =
    createPending || isBusy || availabilityStatus === "checking";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundDefault },
            isTablet && styles.modalContentTablet,
          ]}
        >
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Nueva Cita</ThemedText>
              <ThemedText
                style={[styles.modalSubtitle, { color: theme.textMuted }]}
              >
                {formatDateLabel(selectedDate)} a las {selectedHour}:00
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
          >
            <ClienteSection
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              clientLabel={clientSectionTitle}
            />

            <CategoriaSection
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              services={services}
            />

            <ServicioSection
              theme={theme}
              currencySymbol={currencySymbol}
              formData={formData}
              setFormData={setFormData}
              servicesByCategory={servicesByCategory}
              selectedCategory={selectedCategory}
              servicesLoading={servicesLoading}
              servicesError={servicesError}
            />

            <StaffSection
              theme={theme}
              formData={formData}
              setFormData={setFormData}
              employees={employees}
              employeesLoading={employeesLoading}
              employeesError={employeesError}
              staffSingular={staffSingular}
              staffPlural={staffPlural}
            />

            {formData.serviceId && formData.employeeId ? (
              <SummaryCard
                theme={theme}
                currencySymbol={currencySymbol}
                selectedService={selectedService}
                selectedEmployee={selectedEmployee}
                staffSingular={staffSingular}
              />
            ) : null}

            {availabilityStatus === "busy" ? (
              <View
                style={[
                  styles.availabilityBanner,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather name="alert-triangle" size={18} color={theme.text} />
                <ThemedText
                  style={[styles.availabilityBannerText, { color: theme.text }]}
                >
                  Horario ocupado
                  {busyUntilLabel ? `. Termina a las ${busyUntilLabel}` : ""}.
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary },
              disableSubmit && { opacity: 0.65 },
            ]}
            onPress={onSubmit}
            disabled={disableSubmit}
          >
            {createPending || availabilityStatus === "checking" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="calendar" size={18} color="#FFFFFF" />
                <ThemedText style={styles.submitButtonText}>
                  {isBusy ? "Horario ocupado" : "Crear Cita"}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
