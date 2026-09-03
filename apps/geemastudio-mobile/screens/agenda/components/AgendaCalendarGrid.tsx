import React from 'react'
import { View, ScrollView, Pressable, RefreshControl } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'

import type { TenantConfig, TimeFormatPreference } from '@zmtech/tenant-config'
import { esCeldaAgendaEnHorarioLaboral, formatoHoraAgendaSlot } from '@zmtech/tenant-config'
import { useSalonHolidays } from '@/hooks/useSalonHolidays'

import type { AgendaAppointment, AgendaEmployee, AgendaService, AgendaStatusFilter } from '../types'
import { agendaStyles as styles } from '../agendaStyles'
import {
  getAptsForEmpSlot,
  getAppointmentsForSlot,
  getEmployeeColor,
  getEmployeeFirstName,
  getServiceName,
} from '../agendaUtils'

interface AgendaCalendarGridProps {
  isTablet: boolean
  width: number
  timeColWidth: number
  tabBarHeight: number
  selectedDate: Date
  weekDays: Date[]
  /** Horas enteras mostradas (derivadas de `horasVisiblesParaAgenda`). */
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
  /** IANA del tenant (`config.locale.timezone`). */
  timeZone: string
  language: TenantConfig['locale']['language']
  timeFormat: TimeFormatPreference
  appointments: AgendaAppointment[]
  employees: AgendaEmployee[]
  services: AgendaService[]
  statusFilter: AgendaStatusFilter
  isLoading: boolean
  onRefresh: () => void
  theme: {
    primary: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
    backgroundRoot: string
  }
  onOpenNew: (date: Date, hour: number) => void
  onOpenDetail: (apt: AgendaAppointment) => void
}

export function AgendaCalendarGrid({
  isTablet,
  width,
  timeColWidth,
  tabBarHeight,
  selectedDate,
  weekDays,
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
}: AgendaCalendarGridProps) {
  const { holidayIndex } = useSalonHolidays(true)
  return (
    <ScrollView
      style={styles.calendarContainer}
      contentContainerStyle={{
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {agendaHours.map((hour) => {
        if (isTablet) {
          const empColWidth =
            (width - timeColWidth - Spacing.md * 2) / Math.max(employees.length, 1)
          const dentroFila = esCeldaAgendaEnHorarioLaboral(
            selectedDate,
            hour,
            businessHours,
            timeZone,
            holidayIndex
          )
          const maxInRow = Math.max(
            1,
            ...employees.map(
              (e) =>
                getAptsForEmpSlot(appointments, selectedDate, hour, e.id, statusFilter, timeZone)
                  .length
            )
          )
          const rowMinHeight = 64 + maxInRow * 52
          return (
            <View key={hour} style={[styles.hourRow, { minHeight: rowMinHeight }]}>
              <View style={[styles.timeColumn, { width: timeColWidth }]}>
                <ThemedText
                  style={[styles.timeText, { color: theme.textMuted, fontSize: 11 }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {formatoHoraAgendaSlot(selectedDate, hour, timeZone, language, timeFormat)}
                </ThemedText>
              </View>
              {employees.map((emp) => {
                const apts = getAptsForEmpSlot(
                  appointments,
                  selectedDate,
                  hour,
                  emp.id,
                  statusFilter,
                  timeZone
                )
                return (
                  <View
                    key={emp.id}
                    style={[
                      styles.empSlot,
                      {
                        width: empColWidth,
                        borderColor: theme.border,
                        minHeight: rowMinHeight,
                        flexDirection: 'column',
                      },
                      !dentroFila
                        ? {
                            opacity: 0.5,
                            backgroundColor: theme.backgroundRoot,
                          }
                        : null,
                    ]}
                  >
                    {apts.map((apt) => (
                      <Pressable
                        key={apt.id}
                        style={[
                          styles.aptBlock,
                          {
                            backgroundColor: emp.color + '20',
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
                          style={[styles.aptService, { color: theme.textSecondary }]}
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
                    {dentroFila ? (
                      <Pressable
                        style={{
                          flexGrow: 1,
                          minHeight: apts.length > 0 ? 24 : 48,
                        }}
                        onPress={() => onOpenNew(selectedDate, hour)}
                      />
                    ) : null}
                  </View>
                )
              })}
            </View>
          )
        }

        const maxInSlot = Math.max(
          1,
          ...weekDays.map(
            (d) => getAppointmentsForSlot(appointments, d, hour, statusFilter, timeZone).length
          )
        )
        const rowMinHeight = 56 + maxInSlot * 28
        return (
          <View key={hour} style={[styles.hourRow, { minHeight: rowMinHeight }]}>
            <View style={[styles.timeColumn, { width: timeColWidth }]}>
              <ThemedText
                style={[styles.timeText, { color: theme.textMuted }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {formatoHoraAgendaSlot(
                  weekDays[0] ?? selectedDate,
                  hour,
                  timeZone,
                  language,
                  timeFormat
                )}
              </ThemedText>
            </View>
            {weekDays.map((date, dayIndex) => {
              const dentro = esCeldaAgendaEnHorarioLaboral(
                date,
                hour,
                businessHours,
                timeZone,
                holidayIndex
              )
              const slotAppointments = getAppointmentsForSlot(
                appointments,
                date,
                hour,
                statusFilter,
                timeZone
              )
              return (
                <View
                  key={dayIndex}
                  style={[
                    styles.timeSlot,
                    {
                      borderColor: theme.border,
                      flexDirection: 'column',
                    },
                    !dentro
                      ? {
                          opacity: 0.52,
                          backgroundColor: theme.backgroundRoot,
                        }
                      : null,
                  ]}
                >
                  {slotAppointments.map((apt) => (
                    <Pressable
                      key={apt.id}
                      style={[
                        styles.appointmentChip,
                        {
                          backgroundColor:
                            getEmployeeColor(employees, apt.employee_id, theme.primary) + '20',
                          borderLeftColor: getEmployeeColor(
                            employees,
                            apt.employee_id,
                            theme.primary
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
                          {[apt.client_phone, apt.client_document].filter(Boolean).join(' · ')}
                        </ThemedText>
                      )}
                      <ThemedText
                        style={[
                          styles.chipEmployee,
                          {
                            color: getEmployeeColor(employees, apt.employee_id, theme.primary),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {getEmployeeFirstName(employees, apt.employee_id)}
                      </ThemedText>
                    </Pressable>
                  ))}
                  {dentro ? (
                    <Pressable
                      style={{
                        flexGrow: 1,
                        minHeight: slotAppointments.length > 0 ? 20 : 48,
                      }}
                      onPress={() => onOpenNew(date, hour)}
                    />
                  ) : null}
                </View>
              )
            })}
          </View>
        )
      })}
    </ScrollView>
  )
}
