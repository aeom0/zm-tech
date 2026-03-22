import React from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import { formatDashboardTime } from "../dashboardUtils";
import type { DashboardAppointment } from "../types";
import { dashboardStyles as styles } from "../dashboardStyles";

interface DashboardAppointmentRowProps {
  appointment: DashboardAppointment;
  index: number;
  visibleCount: number;
  theme: {
    border: string;
    primary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    gold: string;
  };
  currencySymbol: string;
  locale: string;
  isTablet: boolean;
  getEmployeeColor: (employeeId: string) => string;
  getEmployeeName: (employeeId: string) => string;
  getServiceName: (serviceId: string) => string;
  onPress: (appointment: DashboardAppointment) => void;
}

export function DashboardAppointmentRow({
  appointment,
  index,
  visibleCount,
  theme,
  currencySymbol,
  locale,
  isTablet,
  getEmployeeColor,
  getEmployeeName,
  getServiceName,
  onPress,
}: DashboardAppointmentRowProps) {
  const empColor = getEmployeeColor(appointment.employee_id);
  const isLast = index === visibleCount - 1;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.appointmentRow,
        {
          borderBottomColor: theme.border,
          borderBottomWidth: isLast ? 0 : 1,
        },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => onPress(appointment)}
    >
      <View style={styles.rowTime}>
        <ThemedText style={[styles.rowTimeText, { color: theme.primary }]}>
          {formatDashboardTime(appointment.date, locale)}
        </ThemedText>
      </View>

      <View style={[styles.rowDot, { backgroundColor: empColor }]} />

      <View style={styles.rowInfo}>
        <ThemedText
          style={[styles.rowClient, { color: theme.text }]}
          numberOfLines={1}
        >
          {appointment.client_name}
        </ThemedText>
        <ThemedText
          style={[styles.rowService, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {getServiceName(appointment.service_id)}
          {isTablet && ` · ${getEmployeeName(appointment.employee_id)}`}
        </ThemedText>
      </View>

      <View style={styles.rowRight}>
        <ThemedText style={[styles.rowPrice, { color: theme.gold }]}>
          {currencySymbol}
          {parseFloat(String(appointment.price)).toFixed(0)}
        </ThemedText>
        <ThemedText style={[styles.rowDuration, { color: theme.textMuted }]}>
          {appointment.duration}m
        </ThemedText>
      </View>

      <Feather
        name="chevron-right"
        size={14}
        color={theme.textMuted}
        style={{ marginLeft: 4 }}
      />
    </Pressable>
  );
}
