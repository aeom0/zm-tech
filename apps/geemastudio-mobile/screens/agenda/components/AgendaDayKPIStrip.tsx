/**
 * AgendaDayKPIStrip — métricas del día para la vista owner.
 *
 * Tres cards en una fila; cada una flex:1 para ocupar todo el ancho útil.
 */
import React, { useMemo } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { esMismoDiaCalendarioEnZona } from "@geemastudio/tenant-config";

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
        flex: 1,
        minWidth: 0,
        backgroundColor: theme.backgroundSecondary,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 6,
        paddingVertical: Spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: color + "18",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={13} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText
          style={{ fontSize: 10, fontWeight: "600", color: theme.textMuted }}
          numberOfLines={2}
        >
          {label}
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: theme.text,
            marginTop: 2,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
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
    () =>
      dayApts.filter((apt) => matchesStatusFilter(apt.status, statusFilter))
        .length,
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
    <View
      style={{
        flexDirection: "row",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingTop: 2,
        paddingBottom: Spacing.xs,
      }}
    >
      <KPICard
        label="Citas"
        value={String(filteredCount)}
        icon="calendar"
        theme={theme}
      />
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
    </View>
  );
}
