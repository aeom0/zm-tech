/**
 * OwnerWeekGrid — vista semanal compacta para el owner.
 *
 * 7 columnas (lun–dom). Header de cada día con nombre abreviado, número
 * y badge con total de citas. Columna de hoy con fondo sutil.
 * Tocar columna → vista diaria. Tocar chip → detalle de cita.
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
  formatoHoraInstanteEnZona,
  type TenantConfig,
  type TimeFormatPreference,
} from "@zmtech/tenant-config";

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
  language: TenantConfig["locale"]["language"];
  timeFormat: TimeFormatPreference;
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
  onSelectDay: (date: Date) => void;
  onOpenDetail: (apt: AgendaAppointment) => void;
}

function fmtWeekday(date: Date, language: string, timeZone: string): string {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    weekday: "short",
  }).format(date);
}

function fmtDayNum(date: Date, language: string, timeZone: string): string {
  return new Intl.DateTimeFormat(language, { timeZone, day: "numeric" }).format(
    date,
  );
}

export function OwnerWeekGrid({
  tabBarHeight,
  weekDays,
  timeZone,
  language,
  timeFormat,
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
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
    );
  }, [appointments, weekDays, timeZone, statusFilter]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
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
          const count = aptsByDay[i]?.length ?? 0;
          return (
            <Pressable
              key={i}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: Spacing.sm,
              }}
              onPress={() => onSelectDay(day)}
            >
              {/* Nombre del día */}
              <ThemedText
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isToday ? theme.primary : theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {fmtWeekday(day, language, timeZone)}
              </ThemedText>

              {/* Círculo con número */}
              <View
                style={[
                  {
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  },
                  isToday && { backgroundColor: theme.primary },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 14,
                    fontWeight: isToday ? "700" : "500",
                    color: isToday ? "#FFFFFF" : theme.text,
                  }}
                >
                  {fmtDayNum(day, language, timeZone)}
                </ThemedText>
              </View>

              {/* Badge contador de citas */}
              {count > 0 ? (
                <View
                  style={{
                    marginTop: 3,
                    backgroundColor: isToday
                      ? theme.primary + "30"
                      : theme.backgroundSecondary,
                    borderRadius: 8,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    minWidth: 18,
                    alignItems: "center",
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: isToday ? theme.primary : theme.textMuted,
                    }}
                  >
                    {count}
                  </ThemedText>
                </View>
              ) : (
                <View style={{ height: 14, marginTop: 3 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Cuerpo — columnas */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {weekDays.map((day, i) => {
          const dayApts = aptsByDay[i] ?? [];
          const isToday = esHoyEnZonaIANA(day, timeZone);

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
                backgroundColor: isToday ? theme.primary + "08" : "transparent",
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
                    opacity: 0.5,
                  }}
                >
                  —
                </ThemedText>
              ) : (
                dayApts.map((apt) => {
                  const empColor =
                    employeeColorMap[apt.employee_id] ?? theme.primary;
                  const svcName = getServiceName(services, apt.service_id);
                  const timeLabel = formatoHoraInstanteEnZona(
                    new Date(apt.date),
                    timeZone,
                    language,
                    timeFormat,
                  );

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
                      {/* Hora */}
                      <ThemedText
                        numberOfLines={1}
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: theme.textMuted,
                        }}
                      >
                        {timeLabel}
                      </ThemedText>
                      {/* Servicio o cliente */}
                      <ThemedText
                        numberOfLines={1}
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: theme.text,
                          marginTop: 1,
                        }}
                      >
                        {svcName || apt.client_name}
                      </ThemedText>
                      {/* Cliente (solo si hay nombre de servicio) */}
                      {!!svcName && (
                        <ThemedText
                          numberOfLines={1}
                          style={{
                            fontSize: 9,
                            color: theme.textSecondary,
                            marginTop: 1,
                          }}
                        >
                          {apt.client_name}
                        </ThemedText>
                      )}
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
