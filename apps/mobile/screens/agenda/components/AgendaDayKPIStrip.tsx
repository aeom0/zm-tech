/**
 * AgendaDayKPIStrip — métricas del día para la vista owner.
 *
 * Tres cards compactas en fila horizontal (scroll si hace falta).
 */
import React, { useMemo } from "react";
import { View, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { esMismoDiaCalendarioEnZona } from "@salonpro/tenant-config";

import type { AgendaAppointment, AgendaStatusFilter } from "../types";
import { matchesStatusFilter } from "../agendaUtils";

interface AgendaDayKPIStripProps {
  selectedDate: Date;
  timeZone: string;
  appointments: AgendaAppointment[];
  statusFilter: AgendaStatusFilter;
  currencySymbol: string;
  theme: {
    primary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    backgroundSecondary: string;
    warning: string;
  };
}

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  accent?: string;
  theme: AgendaDayKPIStripProps["theme"];
}

function KPICard({ label, value, icon, accent, theme }: KPICardProps) {
  const color = accent ?? theme.primary;
  return (
    <View
      style={{
        backgroundColor: theme.backgroundSecondary,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        minWidth: 92,
        maxWidth: 132,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.xs,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: color + "18",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={12} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText
          style={{ fontSize: 9, fontWeight: "600", color: theme.textMuted, letterSpacing: 0.2 }}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
        <ThemedText
          style={{ fontSize: 14, fontWeight: "700", color: theme.text, marginTop: 1 }}
          numberOfLines={1}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

export function AgendaDayKPIStrip({
  selectedDate,
  timeZone,
  appointments,
  statusFilter,
  currencySymbol,
  theme,
}: AgendaDayKPIStripProps) {
  const dayApts = useMemo(
    () =>
      appointments.filter((apt) =>
        esMismoDiaCalendarioEnZona(new Date(apt.date), selectedDate, timeZone),
      ),
    [appointments, selectedDate, timeZone],
  );

  const filteredCount = useMemo(
    () => dayApts.filter((apt) => matchesStatusFilter(apt.status, statusFilter)).length,
    [dayApts, statusFilter],
  );

  const totalRevenue = useMemo(
    () =>
      dayApts
        .filter((apt) => matchesStatusFilter(apt.status, statusFilter))
        .reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0),
    [dayApts, statusFilter],
  );

  const unassignedCount = useMemo(
    () => dayApts.filter((apt) => !apt.employee_id).length,
    [dayApts],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, maxHeight: 52 }}
      contentContainerStyle={{
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        gap: Spacing.sm,
        alignItems: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
      <KPICard label="Citas" value={String(filteredCount)} icon="calendar" theme={theme} />
      <KPICard
        label="Ingresos"
        value={`${currencySymbol} ${totalRevenue.toFixed(2)}`}
        icon="dollar-sign"
        theme={theme}
      />
      <KPICard
        label="Sin asignar"
        value={String(unassignedCount)}
        icon="user-x"
        accent={unassignedCount > 0 ? theme.warning : theme.textMuted}
        theme={theme}
      />
    </ScrollView>
  );
}
