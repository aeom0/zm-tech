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

import type { TenantConfig } from "@salonpro/tenant-config";
import type { TimeFormatPreference } from "@salonpro/tenant-config";
import {
  diaDelMesEnZona,
  diaTieneFranjaAgenda,
  esCeldaAgendaEnHorarioLaboral,
  formatoHoraAgendaSlot,
  indiceDiaSemanaJSEnZona,
  zonaIANASegura,
} from "@salonpro/tenant-config";

import { DAYS_ES } from "../constants";
import type { AgendaAppointment, AgendaService } from "../types";
import { agendaStyles as styles } from "../agendaStyles";

type Theme = {
  backgroundDefault: string;
  backgroundSecondary: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  error: string;
};

interface AppointmentDetailModalProps {
  visible: boolean;
  onClose: () => void;
  isTablet: boolean;
  theme: Theme;
  appointment: AgendaAppointment | null;
  services: AgendaService[];
  agendaHours: number[];
  businessHours: TenantConfig["businessHours"];
  timeZone: string;
  language: TenantConfig["locale"]["language"];
  timeFormat: TimeFormatPreference;
  weekDays: Date[];
  rescheduleDate: Date | null;
  rescheduleHour: number;
  onRescheduleDate: (d: Date) => void;
  onRescheduleHour: (h: number) => void;
  onReschedule: () => void;
  onDelete: () => void;
  updatePending: boolean;
  deletePending: boolean;
  availabilityStatus?: "idle" | "checking" | "free" | "busy" | "error";
  busyUntilLabel?: string | null;
  isBusy?: boolean;
}

export function AppointmentDetailModal({
  visible,
  onClose,
  isTablet,
  theme,
  appointment,
  services,
  agendaHours,
  businessHours,
  timeZone,
  language,
  timeFormat,
  weekDays,
  rescheduleDate,
  rescheduleHour,
  onRescheduleDate,
  onRescheduleHour,
  onReschedule,
  onDelete,
  updatePending,
  deletePending,
  availabilityStatus = "idle",
  busyUntilLabel = null,
  isBusy = false,
}: AppointmentDetailModalProps) {
  const enFranjaConfigurada =
    !!rescheduleDate &&
    esCeldaAgendaEnHorarioLaboral(
      rescheduleDate,
      rescheduleHour,
      businessHours,
      timeZone,
    );

  const disableReschedule =
    updatePending ||
    isBusy ||
    availabilityStatus === "checking" ||
    !enFranjaConfigurada;

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
          {appointment ? (
            <>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Cita</ThemedText>
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
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textMuted }]}
                >
                  Clienta
                </ThemedText>
                <ThemedText
                  style={[styles.summaryValue, { color: theme.text }]}
                >
                  {appointment.client_name}
                </ThemedText>
                {appointment.client_phone ? (
                  <ThemedText
                    style={[
                      styles.summaryValue,
                      { color: theme.text, fontSize: 14 },
                    ]}
                  >
                    Tel: {appointment.client_phone}
                  </ThemedText>
                ) : null}
                {appointment.client_document ? (
                  <ThemedText
                    style={[
                      styles.summaryValue,
                      { color: theme.text, fontSize: 14 },
                    ]}
                  >
                    DNI: {appointment.client_document}
                  </ThemedText>
                ) : null}
                <ThemedText
                  style={[
                    styles.summaryLabel,
                    { color: theme.textMuted, marginTop: Spacing.md },
                  ]}
                >
                  Servicio
                </ThemedText>
                <ThemedText
                  style={[styles.summaryValue, { color: theme.text }]}
                >
                  {services.find((s) => s.id === appointment.service_id)
                    ?.name ?? "—"}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.summaryLabel,
                    { color: theme.textMuted, marginTop: Spacing.sm },
                  ]}
                >
                  {new Intl.DateTimeFormat(language, {
                    timeZone: zonaIANASegura(timeZone),
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: timeFormat === "12",
                  }).format(new Date(appointment.date))}
                </ThemedText>
              </View>

              <View style={styles.formSection}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  Reprogramar a
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsContainer}
                >
                  {weekDays.map((d) => {
                    const isSelected =
                      rescheduleDate?.toDateString() === d.toDateString();
                    const diaConFranja = diaTieneFranjaAgenda(
                      d,
                      agendaHours,
                      businessHours,
                      timeZone,
                    );
                    return (
                      <Pressable
                        key={d.toISOString()}
                        style={[
                          styles.serviceChip,
                          { borderColor: theme.border },
                          isSelected && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                          !diaConFranja && { opacity: 0.4 },
                        ]}
                        onPress={() => {
                          if (diaConFranja) onRescheduleDate(d);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.serviceChipName,
                            isSelected && { color: "#FFFFFF" },
                          ]}
                        >
                          {DAYS_ES[indiceDiaSemanaJSEnZona(d, timeZone)]}{" "}
                          {diaDelMesEnZona(d, timeZone)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.chipsContainer,
                    { marginTop: Spacing.sm },
                  ]}
                >
                  {agendaHours.map((h) => {
                    const isSelected = rescheduleHour === h;
                    const horaPermitida =
                      !!rescheduleDate &&
                      esCeldaAgendaEnHorarioLaboral(
                        rescheduleDate,
                        h,
                        businessHours,
                        timeZone,
                      );
                    return (
                      <Pressable
                        key={h}
                        style={[
                          styles.employeeChip,
                          { borderColor: theme.border },
                          isSelected && {
                            backgroundColor: theme.primary,
                            borderColor: theme.primary,
                          },
                          !horaPermitida && { opacity: 0.35 },
                        ]}
                        onPress={() => {
                          if (horaPermitida) onRescheduleHour(h);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.employeeChipName,
                            isSelected && { color: "#FFFFFF" },
                          ]}
                        >
                          {rescheduleDate
                            ? formatoHoraAgendaSlot(
                                rescheduleDate,
                                h,
                                zonaIANASegura(timeZone),
                                language,
                                timeFormat,
                              )
                            : `${h}:00`}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {rescheduleDate && !enFranjaConfigurada ? (
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: theme.error, marginTop: Spacing.sm },
                    ]}
                  >
                    Ese día u hora está fuera de la franja configurada del negocio.
                  </ThemedText>
                ) : null}
              </View>

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
                    style={[
                      styles.availabilityBannerText,
                      { color: theme.text },
                    ]}
                  >
                    Horario ocupado
                    {busyUntilLabel ? `. Termina a las ${busyUntilLabel}` : ""}.
                  </ThemedText>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.primary,
                    marginBottom: Spacing.sm,
                  },
                  disableReschedule && { opacity: 0.65 },
                ]}
                onPress={onReschedule}
                disabled={disableReschedule}
              >
                {updatePending || availabilityStatus === "checking" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="calendar" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.submitButtonText}>
                      {isBusy ? "Horario ocupado" : "Reprogramar"}
                    </ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.submitButton, { backgroundColor: theme.error }]}
                onPress={onDelete}
                disabled={deletePending}
              >
                {deletePending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="trash-2" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.submitButtonText}>
                      Eliminar cita
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
