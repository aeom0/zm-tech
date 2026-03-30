import React, { useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  esCeldaAgendaEnHorarioLaboral,
  esHoyEnZonaIANA,
  instanteCitaEnZona,
  minutosDelDiaEnZona,
  type TenantConfig,
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

const GRADIENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["#40E0D0", "#007AFF"],
  ["#E91E8C", "#6A1B9A"],
] as const;

interface OwnerDayGridProps {
  timeColWidth: number;
  columnWidth: number;
  tabBarHeight: number;
  selectedDate: Date;
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
}

function formatHourLabel(
  fechaColumna: Date,
  hour: number,
  locale: string,
  tz: string,
): string {
  const inst = instanteCitaEnZona(fechaColumna, hour, tz);
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(inst);
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
  appointments,
  employees,
  services,
  statusFilter,
  isLoading,
  onRefresh,
  theme,
  onOpenNew,
  onOpenDetail,
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
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
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
                style={{ fontSize: 11, color: theme.textMuted, fontWeight: "600" }}
              >
                {formatHourLabel(selectedDate, hour, language, timeZone)}
              </ThemedText>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          nestedScrollEnabled
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: "row", height: totalHeight }}>
            {employees.map((emp, empIndex) => {
              const empApts = dayAppointments.filter(
                (a) => a.employee_id === emp.id,
              );
              const [g0] =
                GRADIENT_PAIRS[empIndex % GRADIENT_PAIRS.length] ?? GRADIENT_PAIRS[0];

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
                    const top = Math.max(
                      0,
                      (startMin - gridStartMin) * pxPerMinute,
                    );
                    const bottom = (endMin - gridStartMin) * pxPerMinute;
                    const height = Math.max(
                      28,
                      Math.min(bottom, totalHeight) - top,
                    );
                    if (top >= totalHeight) return null;

                    const serviceName = getServiceName(services, apt.service_id);

                    return (
                      <Pressable
                        key={apt.id}
                        onPress={() => onOpenDetail(apt)}
                        style={{
                          position: "absolute",
                          left: 4,
                          right: 4,
                          top,
                          height,
                          zIndex: 4,
                          borderRadius: BorderRadius.md,
                          overflow: "hidden",
                        }}
                      >
                        <LinearGradient
                          colors={[
                            `${g0}CC`,
                            `${theme.card}F0`,
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            flex: 1,
                            padding: Spacing.sm,
                            borderRadius: BorderRadius.md,
                            borderWidth: 1,
                            borderColor: emp.color + "55",
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
                            {serviceName}
                          </ThemedText>
                          <ThemedText
                            numberOfLines={1}
                            style={{
                              fontSize: 11,
                              marginTop: 2,
                              color: theme.textSecondary,
                            }}
                          >
                            — {apt.client_name}
                          </ThemedText>
                          <ThemedText
                            numberOfLines={1}
                            style={{
                              fontSize: 10,
                              marginTop: 4,
                              color: theme.textMuted,
                            }}
                          >
                            {new Intl.DateTimeFormat(language, {
                              timeZone,
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(start)}
                          </ThemedText>
                        </LinearGradient>
                      </Pressable>
                    );
                  })}

                  {nowLineTop !== null ? (
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
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}
