import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { formatCurrency } from "@/utils/format";
import type { AppointmentHistory } from "../types";

interface Props {
  appointment: AppointmentHistory;
}

export function ClientAppointmentRow({ appointment }: Props) {
  const { theme } = useTheme();
  const { config } = useTenant();

  const { date, status, services, employee_name, employee_color, total_paid, pending_amount } =
    appointment;

  const dateLabel = new Date(date).toLocaleString(config.locale.language, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusConfig =
    status === "completed"
      ? { label: "Completado", color: theme.success }
      : status === "cancelled"
        ? { label: "Cancelado", color: theme.error }
        : { label: "Pendiente", color: theme.warning };

  const serviceLabel =
    services.length > 0
      ? services.map((s) => s.name).join(" · ")
      : "Servicio";

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.border,
          backgroundColor: theme.backgroundSecondary,
        },
      ]}
    >
      <View style={styles.left}>
        <ThemedText style={[styles.service, { color: theme.text }]} numberOfLines={2}>
          {serviceLabel}
        </ThemedText>
        <ThemedText style={[styles.date, { color: theme.textMuted }]}>
          {dateLabel}
        </ThemedText>
        {employee_name && (
          <View style={styles.empRow}>
            {employee_color && (
              <View
                style={[
                  styles.empDot,
                  { backgroundColor: employee_color },
                ]}
              />
            )}
            <ThemedText
              style={[styles.professional, { color: theme.textSecondary }]}
            >
              {employee_name}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.right}>
        <ThemedText style={[styles.amount, { color: theme.gold }]}>
          {formatCurrency(total_paid, config)}
        </ThemedText>
        {pending_amount > 0 && (
          <ThemedText style={[styles.pending, { color: theme.error }]}>
            -{formatCurrency(pending_amount, config)}
          </ThemedText>
        )}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${statusConfig.color}18` },
          ]}
        >
          <ThemedText
            style={[styles.statusText, { color: statusConfig.color }]}
          >
            {statusConfig.label}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  service: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  empRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  empDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  professional: {
    fontSize: 12,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
  },
  pending: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
