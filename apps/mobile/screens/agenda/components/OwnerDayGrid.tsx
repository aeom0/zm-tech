import React, { useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  esCeldaAgendaEnHorarioLaboral,
  esHoyEnZonaIANA,
  formatoHoraAgendaSlot,
  formatoHoraInstanteEnZona,
  minutosDelDiaEnZona,
  type TenantConfig,
  type TimeFormatPreference,
} from "@salonpro/tenant-config";

import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaService,
  AgendaStatusFilter,
} from "../types";
import {
  filterAppointmentsForOwnerDay,
  getServiceName,
} from "../agendaUtils";
import { useAgendaClockTick } from "../hooks/useAgendaClockTick";
import { agendaStyles as sharedStyles } from "../agendaStyles";

const HOUR_ROW_HEIGHT = 64;

interface OwnerDayGridProps {
  timeColWidth: number;
  columnWidth: number;
  tabBarHeight: number;
  selectedDate: Date;
  agendaHours: number[];
  businessHours: TenantConfig["businessHours"];
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
  onOpenNew: (date: Date, hour: number) => void;
  onOpenDetail: (apt: AgendaAppointment) => void;
  /** Ref externo del ScrollView horizontal — para sincronizar con el avatar strip */
  gridScrollRef?: React.RefObject<ScrollView>;
  onGridScroll?: (x: number) => void;
}

export function OwnerDayGrid({
  timeColWidth,
  columnWidth,
  tabBarHeight,
  selectedDate,
  agendaHours,
  businessHours,
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
  onOpenNew,
  onOpenDetail,
  gridScrollRef,
  onGridScroll,
}: OwnerDayGridProps) {
  const gridStartMin = useMemo(
    () => Math.min(...agendaHours) * 60,
    [agendaHours],
  );
  const gridEndMin = useMemo(
    () => Math.max(...agendaHours) * 60 + 60,
    [agendaHours],
  );
  const totalHeight = agendaHours.length * HOUR_ROW_HEIGHT;
  const pxPerMinute = HOUR_ROW_HEIGHT / 60;

  const isTodayInTz = useMemo(
    () => esHoyEnZonaIANA(selectedDate, timeZone),
    [selectedDate, timeZone],
  );

  const now = useAgendaClockTick(isTodayInTz);

  const dayAppointments = useMemo(
    () =>
      filterAppointmentsForOwnerDay(
        appointments,
        selectedDate,
        employees.map((e) => e.id),
        statusFilter,
        timeZone,
      ),
    [appointments, selectedDate, employees, statusFilter, timeZone],
  );

  const nowLineTop = useMemo(() => {
    if (!isTodayInTz) return null;
    const m = minutosDelDiaEnZona(now, timeZone);
    if (m < gridStartMin || m > gridEndMin) return null;
    return (m - gridStartMin) * pxPerMinute;
  }, [isTodayInTz, now, timeZone, gridStartMin, gridEndMin, pxPerMinute]);

  const colW = Math.max(columnWidth, 104);
  const totalGridWidth = colW * employees.length;

  return (
    <ScrollView
      style={sharedStyles.calendarContainer}
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
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        {/* Columna de horas — fija */}
        <View style={{ width: timeColWidth }}>
          {agendaHours.map((hour) => (
            <View
              key={hour}
              style={{
                height: HOUR_ROW_HEIGHT,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
                justifyContent: "flex-start",
                paddingTop: 4,
                alignItems: "center",
              }}
            >
              <ThemedText
                style={{ fontSize: 10, color: theme.textMuted, fontWeight: "600" }}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {formatoHoraAgendaSlot(selectedDate, hour, timeZone, language, timeFormat)}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Columnas de empleados — scroll horizontal */}
        <ScrollView
          ref={gridScrollRef}
          horizontal
          showsHorizontalScrollIndicator
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScroll={onGridScroll ? (e) => onGridScroll(e.nativeEvent.contentOffset.x) : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: "row", height: totalHeight, width: totalGridWidth, position: "relative" }}>
            {employees.map((emp) => {
              const empApts = dayAppointments.filter(
                (a) => a.employee_id === emp.id,
              );

              return (
                <View
                  key={emp.id}
                  style={{
                    width: colW,
                    height: totalHeight,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderLeftColor: theme.border,
                    position: "relative",
                  }}
                >
                  {agendaHours.map((hour) => {
                    const dentroFila = esCeldaAgendaEnHorarioLaboral(
                      selectedDate,
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
                          backgroundColor: dentroFila
                            ? "transparent"
                            : theme.backgroundRoot + "99",
                          opacity: dentroFila ? 1 : 0.45,
                        }}
                      >
                        {dentroFila ? (
                          <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => onOpenNew(selectedDate, hour)}
                            accessibilityRole="button"
                            accessibilityLabel={`Nueva cita ${hour}:00`}
                          />
                        ) : null}
                      </View>
                    );
                  })}

                  {empApts.map((apt) => {
                    const start = new Date(apt.date);
                    const startMin = minutosDelDiaEnZona(start, timeZone);
                    const endMin = startMin + apt.duration;
                    const top = Math.max(0, (startMin - gridStartMin) * pxPerMinute);
                    const bottom = (endMin - gridStartMin) * pxPerMinute;
                    const height = Math.max(28, Math.min(bottom, totalHeight) - top);
                    if (top >= totalHeight) return null;

                    const serviceName = getServiceName(services, apt.service_id);

                    return (
                      <Pressable
                        key={apt.id}
                        onPress={() => onOpenDetail(apt)}
                        style={{
                          position: "absolute",
                          left: 3,
                          right: 3,
                          top,
                          height,
                          zIndex: 4,
                          borderRadius: BorderRadius.md,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            padding: Spacing.sm,
                            borderRadius: BorderRadius.md,
                            borderWidth: 1,
                            borderLeftWidth: 4,
                            borderColor: emp.color + "44",
                            borderLeftColor: emp.color,
                            backgroundColor: emp.color + "18",
                          }}
                        >
                          <ThemedText
                            numberOfLines={2}
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: theme.text,
                            }}
                          >
                            {serviceName || apt.client_name}
                          </ThemedText>
                          {!!serviceName && (
                            <ThemedText
                              numberOfLines={1}
                              style={{
                                fontSize: 11,
                                marginTop: 2,
                                color: theme.textSecondary,
                              }}
                            >
                              {apt.client_name}
                            </ThemedText>
                          )}
                          <ThemedText
                            numberOfLines={1}
                            style={{
                              fontSize: 10,
                              marginTop: 2,
                              color: theme.textMuted,
                            }}
                          >
                            {formatoHoraInstanteEnZona(start, timeZone, language, timeFormat)}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            {/* Línea "ahora" — una sola vez, sobre todo el grid */}
            {nowLineTop !== null && (
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
        </ScrollView>
      </View>
    </ScrollView>
  );
}
