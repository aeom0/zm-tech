import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { ClientKPIs } from "../types";
import { useTenant } from "@/contexts/TenantContext";
import { formatCurrency } from "@/utils/format";

interface Props {
  kpis: ClientKPIs | null;
}

export function ClientKPIStrip({ kpis }: Props) {
  const { theme } = useTheme();
  const { config } = useTenant();

  if (!kpis) return null;

  const cards = [
    {
      id: "total",
      label: "Total clientes",
      value: kpis.total_clients.toString(),
      icon: "users" as const,
      color: theme.primary,
    },
    {
      id: "active",
      label: "Activos este mes",
      value: kpis.active_this_month.toString(),
      icon: "activity" as const,
      color: theme.success,
    },
    {
      id: "vip",
      label: "Clientes VIP",
      value: kpis.vip_count.toString(),
      icon: "star" as const,
      color: theme.accent,
    },
    {
      id: "risk",
      label: "En riesgo",
      value: kpis.at_risk_count.toString(),
      icon: "alert-triangle" as const,
      color: theme.warning,
    },
    {
      id: "avg",
      label: "Ticket promedio",
      value: formatCurrency(kpis.avg_ticket, config),
      icon: "shopping-bag" as const,
      color: theme.info,
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {cards.map((card) => (
        <View
          key={card.id}
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: `${card.color}18` }]}
          >
            <Feather name={card.icon} size={16} color={card.color} />
          </View>
          <ThemedText
            style={[
              styles.value,
              { color: card.id === "risk" ? theme.error : card.color },
            ]}
            numberOfLines={1}
          >
            {card.value}
          </ThemedText>
          <ThemedText
            style={[styles.label, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {card.label}
          </ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    width: 150,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
  },
});
