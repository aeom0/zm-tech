/**
 * OwnerWeekGrid — vista semanal compacta para el owner.
 *
 * Muestra 7 columnas (lun–dom) con las citas del día como chips.
 * Tocar un día navega a la vista diaria de ese día.
 * Tocar una cita abre el detalle.
 */
import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  esMismoDiaCalendarioEnZona,
  esHoyEnZonaIANA,
  type TenantConfig,
} from "@salonpro/tenant-config";

import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaService,
  AgendaStatusFilter,
} from "../types";
import { getServiceName, matchesStatusFilter } from "../agendaUtils";

interface OwnerWeekGridProps {
  tabBarHeight: number;
  weekDays: Date[];
  timeZone: string;
  language: string;
  appointments: AgendaAppointment[];
  employees: AgendaEmployee[];
  services: AgendaService[];
  statusFilter: AgendaStatusFilter;
  isLoading: boolean;
  onRefresh: () => void;
  theme: {
    primary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    backgroundRoot: string;
    backgroundSecondary: string;
    card: string;
  };
  /** Al tocar una columna de día → ir a vista diaria de ese día */
  onSelectDay: (date: Date) => void;
  onOpenDetail: (apt: AgendaAppointment) => void;
}

function dayName(date: Date, language: string, timeZone: string): string {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    weekday: "short",
  }).format(date);
}

function dayNumber(date: Date, language: string, timeZone: string): string {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    day: "numeric",
  }).format(date);
}

export function OwnerWeekGrid({
  tabBarHeight,
  weekDays,
  timeZone,
  language,
  appointments,
  employees,
  services,
  statusFilter,
  isLoading,
  onRefresh,
  theme,
  onSelectDay,
  onOpenDetail,
}: OwnerWeekGridProps) {
  const employeeColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of employees) m[e.id] = e.color;
    return m;
  }, [employees]);

  /** Citas por día, ya filtradas */
  const aptsByDay = useMemo(() => {
    return weekDays.map((day) =>
      appointments
        .filter((apt) => {
          const aptDate = new Date(apt.date);
          return (
            esMismoDiaCalendarioEnZona(aptDate, day, timeZone) &&
            matchesStatusFilter(apt.status, statusFilter)
          );
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    );
  }, [appointments, weekDays, timeZone, statusFilter]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Cabeceras de días */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        }}
      >
        {weekDays.map((day, i) => {
          const isToday = esHoyEnZonaIANA(day, timeZone);
          return (
            <Pressable
              key={i}
              style={{ flex: 1, alignItems: "center", paddingVertical: Spacing.sm }}
              onPress={() => onSelectDay(day)}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  fontWeight: "500",
                  color: isToday ? theme.primary : theme.textMuted,
                  textTransform: "uppercase",
                }}
              >
                {dayName(day, language, timeZone)}
              </ThemedText>
              <View
                style={[
                  {
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  },
                  isToday && { backgroundColor: theme.primary },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 15,
                    fontWeight: isToday ? "700" : "500",
                    color: isToday ? "#FFFFFF" : theme.text,
                  }}
                >
                  {dayNumber(day, language, timeZone)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Cuerpo — columnas con chips de citas */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {weekDays.map((day, i) => {
          const dayApts = aptsByDay[i] ?? [];
          return (
            <Pressable
              key={i}
              style={{
                flex: 1,
                minHeight: 200,
                borderLeftWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                borderLeftColor: theme.border,
                paddingHorizontal: 3,
                paddingTop: Spacing.sm,
                gap: 4,
              }}
              onPress={() => onSelectDay(day)}
            >
              {dayApts.length === 0 ? (
                <ThemedText
                  style={{
                    fontSize: 10,
                    color: theme.textMuted,
                    textAlign: "center",
                    marginTop: Spacing.md,
                  }}
                >
                  —
                </ThemedText>
              ) : (
                dayApts.map((apt) => {
                  const empColor = employeeColorMap[apt.employee_id] ?? theme.primary;
                  const svcName = getServiceName(services, apt.service_id);
                  const timeLabel = new Intl.DateTimeFormat(language, {
                    timeZone,
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(apt.date));

                  return (
                    <Pressable
                      key={apt.id}
                      onPress={(e) => {
                        e.stopPropagation();
                        onOpenDetail(apt);
                      }}
                      style={{
                        borderRadius: BorderRadius.sm,
                        borderLeftWidth: 3,
                        borderLeftColor: empColor,
                        backgroundColor: empColor + "18",
                        paddingHorizontal: 4,
                        paddingVertical: 3,
                      }}
                    >
                      <ThemedText
                        numberOfLines={1}
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: theme.text,
                        }}
                      >
                        {timeLabel}
                      </ThemedText>
                      <ThemedText
                        numberOfLines={1}
                        style={{
                          fontSize: 9,
                          color: theme.textSecondary,
                          marginTop: 1,
                        }}
                      >
                        {svcName || apt.client_name}
                      </ThemedText>
                    </Pressable>
                  );
                })
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
