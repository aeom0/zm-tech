/**
 * OwnerWeekGrid — vista semanal del owner.
 * Muestra 7 columnas (lun-dom) con los chips de cita por día.
 * Toque en una cita → onOpenDetail. Toque en un slot vacío → onOpenNew.
 * Toque en la cabecera de un día → onSelectDay (vuelve a la vista diaria).
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
  esCeldaAgendaEnHorarioLaboral,
  esMismoDiaCalendarioEnZona,
  esHoyEnZonaIANA,
  minutosDelDiaEnZona,
  instanteCitaEnZona,
  type TenantConfig,
} from "@salonpro/tenant-config";

import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaService,
  AgendaStatusFilter,
} from "../types";
import { getServiceName } from "../agendaUtils";
import { useAgendaClockTick } from "../hooks/useAgendaClockTick";
import { agendaStyles as sharedStyles } from "../agendaStyles";

const HOUR_ROW_HEIGHT = 56;

interface OwnerWeekGridProps {
  timeColWidth: number;
  tabBarHeight: number;
  weekDays: Date[];
  agendaHours: number[];
  businessHours: TenantConfig["businessHours"];
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
  onOpenNew: (date: Date, hour: number) => void;
  onOpenDetail: (apt: AgendaAppointment) => void;
  /** Al tocar la cabecera de un día, vuelve a la vista diaria en ese día */
  onSelectDay: (date: Date) => void;
}

export function OwnerWeekGrid({
  timeColWidth,
  tabBarHeight,
  weekDays,
  agendaHours,
  businessHours,
  timeZone,
  language,
  appointments,
  employees,
  services,
  statusFilter,
  isLoading,
  onRefresh,
  theme,
  onOpenNew,
  onOpenDetail,
  onSelectDay,
}: OwnerWeekGridProps) {
  const gridStartMin = useMemo(() => Math.min(...agendaHours) * 60, [agendaHours]);
  const gridEndMin = useMemo(() => Math.max(...agendaHours) * 60 + 60, [agendaHours]);
  const totalHeight = agendaHours.length * HOUR_ROW_HEIGHT;
  const pxPerMinute = HOUR_ROW_HEIGHT / 60;

  // La semana puede contener hoy
  const todayIndex = useMemo(
    () => weekDays.findIndex((d) => esHoyEnZonaIANA(d, timeZone)),
    [weekDays, timeZone],
  );
  const now = useAgendaClockTick(todayIndex >= 0);

  const nowLineTop = useMemo(() => {
    if (todayIndex < 0) return null;
    const m = minutosDelDiaEnZona(now, timeZone);
    if (m < gridStartMin || m > gridEndMin) return null;
    return (m - gridStartMin) * pxPerMinute;
  }, [todayIndex, now, timeZone, gridStartMin, gridEndMin, pxPerMinute]);

  const filteredApts = useMemo(() => {
    return appointments.filter((apt) => {
      if (statusFilter !== "all" && apt.status !== statusFilter) return false;
      return weekDays.some((d) =>
        esMismoDiaCalendarioEnZona(new Date(apt.date), d, timeZone),
      );
    });
  }, [appointments, weekDays, statusFilter, timeZone]);

  const dayNames = useMemo(
    () =>
      weekDays.map((d) =>
        new Intl.DateTimeFormat(language, {
          timeZone,
          weekday: "short",
        })
          .format(d)
          .slice(0, 3),
      ),
    [weekDays, language, timeZone],
  );

  const dayNumbers = useMemo(
    () =>
      weekDays.map((d) =>
        new Intl.DateTimeFormat(language, {
          timeZone,
          day: "numeric",
        }).format(d),
      ),
    [weekDays, language, timeZone],
  );

  return (
    <ScrollView
      style={sharedStyles.calendarContainer}
      contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {/* Cabeceras de días — toque navega a vista diaria */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
          marginBottom: 2,
        }}
      >
        <View style={{ width: timeColWidth }} />
        {weekDays.map((day, i) => {
          const isToday = todayIndex === i;
          return (
            <Pressable
              key={i}
              onPress={() => onSelectDay(day)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: Spacing.sm,
              }}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isToday ? theme.primary : theme.textMuted,
                  textTransform: "uppercase",
                }}
              >
                {dayNames[i]}
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
                  {dayNumbers[i]}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Grid horario */}
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        {/* Columna de horas */}
        <View style={{ width: timeColWidth }}>
          {agendaHours.map((hour) => (
            <View
              key={hour}
              style={{
                height: HOUR_ROW_HEIGHT,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
                justifyContent: "flex-start",
                paddingTop: 3,
                alignItems: "center",
              }}
            >
              <ThemedText style={{ fontSize: 10, color: theme.textMuted, fontWeight: "600" }}>
                {new Intl.DateTimeFormat(language, {
                  timeZone,
                  hour: "numeric",
                  minute: "2-digit",
                }).format(instanteCitaEnZona(weekDays[0] ?? new Date(), hour, timeZone))}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Columnas por día */}
        <View style={{ flex: 1, flexDirection: "row", position: "relative" }}>
          {weekDays.map((day, dayIdx) => {
            const isToday = todayIndex === dayIdx;
            const dayApts = filteredApts.filter((apt) =>
              esMismoDiaCalendarioEnZona(new Date(apt.date), day, timeZone),
            );

            return (
              <View
                key={dayIdx}
                style={{
                  flex: 1,
                  height: totalHeight,
                  borderLeftWidth: StyleSheet.hairlineWidth,
                  borderLeftColor: theme.border,
                  position: "relative",
                  backgroundColor: isToday ? theme.primary + "08" : "transparent",
                }}
              >
                {agendaHours.map((hour) => {
                  const enHorario = esCeldaAgendaEnHorarioLaboral(
                    day,
                    hour,
                    businessHours,
                    timeZone,
                  );
                  return (
                    <View
                      key={hour}
                      style={{
                        height: HOUR_ROW_HEIGHT,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border,
                        backgroundColor: enHorario ? "transparent" : theme.backgroundRoot + "88",
                        opacity: enHorario ? 1 : 0.5,
                      }}
                    >
                      {enHorario && (
                        <Pressable
                          style={StyleSheet.absoluteFill}
                          onPress={() => onOpenNew(day, hour)}
                          accessibilityRole="button"
                          accessibilityLabel={`Nueva cita ${hour}:00`}
                        />
                      )}
                    </View>
                  );
                })}

                {dayApts.map((apt) => {
                  const start = new Date(apt.date);
                  const startMin = minutosDelDiaEnZona(start, timeZone);
                  const endMin = startMin + apt.duration;
                  const top = Math.max(0, (startMin - gridStartMin) * pxPerMinute);
                  const bottom = (endMin - gridStartMin) * pxPerMinute;
                  const height = Math.max(20, Math.min(bottom, totalHeight) - top);
                  if (top >= totalHeight) return null;

                  const emp = employees.find((e) => e.id === apt.employee_id);
                  const empColor = emp?.color ?? theme.primary;
                  const serviceName = getServiceName(services, apt.service_id);

                  return (
                    <Pressable
                      key={apt.id}
                      onPress={() => onOpenDetail(apt)}
                      style={{
                        position: "absolute",
                        left: 1,
                        right: 1,
                        top,
                        height,
                        zIndex: 4,
                        borderRadius: BorderRadius.sm,
                        overflow: "hidden",
                        backgroundColor: empColor + "22",
                        borderLeftWidth: 3,
                        borderLeftColor: empColor,
                        paddingHorizontal: 3,
                        paddingVertical: 2,
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
                        {serviceName || apt.client_name}
                      </ThemedText>
                      {height > 32 && (
                        <ThemedText
                          numberOfLines={1}
                          style={{ fontSize: 9, color: theme.textMuted, marginTop: 1 }}
                        >
                          {apt.client_name}
                        </ThemedText>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}

          {/* Línea "ahora" — una sola vez a lo ancho de todos los días */}
          {nowLineTop !== null && todayIndex >= 0 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: nowLineTop - 1,
                height: 2,
                backgroundColor: "#FF3B30",
                zIndex: 12,
              }}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
