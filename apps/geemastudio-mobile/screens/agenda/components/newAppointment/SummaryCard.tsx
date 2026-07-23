import React from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";

import type { AgendaEmployee, AgendaService } from "../../types";
import { agendaStyles as styles } from "../../agendaStyles";
import type { NewAppointmentModalTheme } from "./modalTheme";

interface SummaryCardProps {
  theme: NewAppointmentModalTheme;
  currencySymbol: string;
  selectedService: AgendaService | undefined;
  selectedEmployee: AgendaEmployee | undefined;
  staffSingular: string;
}

export function SummaryCard({
  theme,
  currencySymbol,
  selectedService,
  selectedEmployee,
  staffSingular,
}: SummaryCardProps) {
  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <ThemedText style={[styles.summaryTitle, { color: theme.textSecondary }]}>
        Resumen de la cita
      </ThemedText>
      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
          Servicio
        </ThemedText>
        <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
          {selectedService?.name || "—"}
        </ThemedText>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
          {staffSingular}
        </ThemedText>
        <View style={styles.summaryEmployeeRow}>
          <View
            style={[
              styles.summaryDot,
              { backgroundColor: selectedEmployee?.color },
            ]}
          />
          <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
            {selectedEmployee?.name || "—"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
          Duración
        </ThemedText>
        <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
          {selectedService?.duration || 60} min
        </ThemedText>
      </View>
      <View style={[styles.summaryRow, styles.summaryRowLast]}>
        <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
          Precio
        </ThemedText>
        <ThemedText style={[styles.summaryPrice, { color: Colors.light.gold }]}>
          {currencySymbol} {selectedService?.price || "0"}
        </ThemedText>
      </View>
    </View>
  );
}
