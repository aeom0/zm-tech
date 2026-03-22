import React from "react";
import { View, ScrollView, Pressable, RefreshControl } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

import { AGENDA_HOURS } from "../constants";
import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaService,
  AgendaStatusFilter,
} from "../types";
import { agendaStyles as styles } from "../agendaStyles";
import {
  getAptsForEmpSlot,
  getAppointmentsForSlot,
  getEmployeeColor,
  getEmployeeFirstName,
  getServiceName,
} from "../agendaUtils";

interface AgendaCalendarGridProps {
  isTablet: boolean;
  width: number;
  timeColWidth: number;
  tabBarHeight: number;
  selectedDate: Date;
  weekDays: Date[];
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
  };
  onOpenNew: (date: Date, hour: number) => void;
  onOpenDetail: (apt: AgendaAppointment) => void;
}

export function AgendaCalendarGrid({
  isTablet,
  width,
  timeColWidth,
  tabBarHeight,
  selectedDate,
  weekDays,
  appointments,
  employees,
  services,
  statusFilter,
  isLoading,
  onRefresh,
  theme,
  onOpenNew,
  onOpenDetail,
}: AgendaCalendarGridProps) {
  return (
    <ScrollView
      style={styles.calendarContainer}
      contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {AGENDA_HOURS.map((hour) => {
        if (isTablet) {
          const empColWidth =
            (width - timeColWidth - Spacing.sm * 2) /
            Math.max(employees.length, 1);
          const maxInRow = Math.max(
            1,
            ...employees.map(
              (e) =>
                getAptsForEmpSlot(
                  appointments,
                  selectedDate,
                  hour,
                  e.id,
                  statusFilter,
                ).length,
            ),
          );
          const rowMinHeight = 64 + maxInRow * 52;
          return (
            <View
              key={hour}
              style={[styles.hourRow, { minHeight: rowMinHeight }]}
            >
              <View style={[styles.timeColumn, { width: timeColWidth }]}>
                <ThemedText
                  style={[
                    styles.timeText,
                    { color: theme.textMuted, fontSize: 12 },
                  ]}
                >
                  {hour}:00
                </ThemedText>
              </View>
              {employees.map((emp) => {
                const apts = getAptsForEmpSlot(
                  appointments,
                  selectedDate,
                  hour,
                  emp.id,
                  statusFilter,
                );
                return (
                  <Pressable
                    key={emp.id}
                    style={[
                      styles.empSlot,
                      {
                        width: empColWidth,
                        borderColor: theme.border,
                        minHeight: rowMinHeight,
                      },
                    ]}
                    onPress={() => onOpenNew(selectedDate, hour)}
                  >
                    {apts.map((apt) => (
                      <Pressable
                        key={apt.id}
                        style={[
                          styles.aptBlock,
                          {
                            backgroundColor: emp.color + "20",
                            borderLeftColor: emp.color,
                          },
                        ]}
                        onPress={() => onOpenDetail(apt)}
                      >
                        <ThemedText
                          style={[styles.aptClient, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {apt.client_name}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.aptService,
                            { color: theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {getServiceName(services, apt.service_id)}
                        </ThemedText>
                        {apt.client_phone ? (
                          <ThemedText
                            style={[styles.aptSub, { color: theme.textMuted }]}
                            numberOfLines={1}
                          >
                            {apt.client_phone}
                          </ThemedText>
                        ) : null}
                      </Pressable>
                    ))}
                  </Pressable>
                );
              })}
            </View>
          );
        }

        const maxInSlot = Math.max(
          1,
          ...weekDays.map(
            (d) =>
              getAppointmentsForSlot(appointments, d, hour, statusFilter)
                .length,
          ),
        );
        const rowMinHeight = 56 + maxInSlot * 28;
        return (
          <View
            key={hour}
            style={[styles.hourRow, { minHeight: rowMinHeight }]}
          >
            <View style={[styles.timeColumn, { width: timeColWidth }]}>
              <ThemedText style={[styles.timeText, { color: theme.textMuted }]}>
                {hour}:00
              </ThemedText>
            </View>
            {weekDays.map((date, dayIndex) => {
              const slotAppointments = getAppointmentsForSlot(
                appointments,
                date,
                hour,
                statusFilter,
              );
              return (
                <Pressable
                  key={dayIndex}
                  style={[styles.timeSlot, { borderColor: theme.border }]}
                  onPress={() => onOpenNew(date, hour)}
                >
                  {slotAppointments.map((apt) => (
                    <Pressable
                      key={apt.id}
                      style={[
                        styles.appointmentChip,
                        {
                          backgroundColor:
                            getEmployeeColor(employees, apt.employee_id) + "20",
                          borderLeftColor: getEmployeeColor(
                            employees,
                            apt.employee_id,
                          ),
                        },
                      ]}
                      onPress={() => onOpenDetail(apt)}
                    >
                      <ThemedText
                        style={[styles.chipName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {apt.client_name}
                      </ThemedText>
                      {(apt.client_phone || apt.client_document) && (
                        <ThemedText
                          style={[styles.chipSub, { color: theme.textMuted }]}
                          numberOfLines={1}
                        >
                          {[apt.client_phone, apt.client_document]
                            .filter(Boolean)
                            .join(" · ")}
                        </ThemedText>
                      )}
                      <ThemedText
                        style={[
                          styles.chipEmployee,
                          {
                            color: getEmployeeColor(employees, apt.employee_id),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {getEmployeeFirstName(employees, apt.employee_id)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
