import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { formatCurrency } from "@/utils/format";

interface Props {
  date: string;
  serviceName: string | null;
  professionalName: string | null;
  status: string;
  amountPaid: number;
}

export function ClientAppointmentRow({
  date,
  serviceName,
  professionalName,
  status,
  amountPaid,
}: Props) {
  const { theme } = useTheme();
  const { config } = useTenant();

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
        <ThemedText style={[styles.service, { color: theme.text }]}>
          {serviceName ?? "Servicio"}
        </ThemedText>
        <ThemedText style={[styles.date, { color: theme.textMuted }]}>
          {dateLabel}
        </ThemedText>
        {professionalName && (
          <ThemedText
            style={[styles.professional, { color: theme.textSecondary }]}
          >
            {professionalName}
          </ThemedText>
        )}
      </View>
      <View style={styles.right}>
        <ThemedText style={[styles.amount, { color: theme.gold }]}>
          {formatCurrency(amountPaid, config)}
        </ThemedText>
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
  professional: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
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
