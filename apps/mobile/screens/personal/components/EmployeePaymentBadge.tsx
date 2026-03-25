import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PaymentMode } from "@salonpro/shared-schema";

interface Props {
  mode: PaymentMode;
  percentage?: number | null;
}

const MODE_CONFIG: Record<
  PaymentMode,
  { label: (pct?: number | null) => string; color: string }
> = {
  commission: { label: (pct) => `${pct ?? 0}%`, color: "#E91E8C" },
  salary: { label: () => "Fijo", color: "#1565C0" },
  mixed: { label: (pct) => `S+${pct ?? 0}%`, color: "#9C27B0" },
};

export function EmployeePaymentBadge({ mode, percentage }: Props) {
  const cfg = MODE_CONFIG[mode];

  return (
    <View style={[styles.pill, { borderColor: cfg.color }]}>
      <Text style={[styles.label, { color: cfg.color }]}>
        {cfg.label(percentage)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: { fontSize: 11, fontWeight: "600" },
});
