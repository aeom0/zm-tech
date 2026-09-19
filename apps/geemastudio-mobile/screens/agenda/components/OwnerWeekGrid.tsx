/**
 * OwnerWeekGrid — vista semanal compacta para el owner.
 *
 * 7 columnas (lun–dom). Header de cada día con nombre abreviado, número
 * y badge con total de citas. Columna de hoy con fondo sutil.
 * Tocar columna → vista diaria. Tocar chip → detalle de cita.
 */
import React, { useMemo } from 'react'
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'
import { mixHexColors, getContrastTextColor } from '@/lib/color-hsv'
import {
  esMismoDiaCalendarioEnZona,
  esHoyEnZonaIANA,
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TenantConfig,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import type { AgendaAppointment, AgendaEmployee, AgendaService, AgendaStatusFilter } from '../types'
import {
  getAppointmentServiceNames,
  getAppointmentServiceCount,
  matchesStatusFilter,
} from '../agendaUtils'

interface OwnerWeekGridProps {
  tabBarHeight: number
  weekDays: Date[]
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
    backgroundSecondary: string
    card: string
  }
  onSelectDay: (date: Date) => void
  onOpenDetail: (apt: AgendaAppointment) => void
}

const WEEK_CHIP_RADIUS = 6

function fmtWeekday(date: Date, language: string, timeZone: string): string {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    weekday: 'short',
  }).format(date)
}

function fmtDayNum(date: Date, language: string, timeZone: string): string {
  return new Intl.DateTimeFormat(language, { timeZone, day: 'numeric' }).format(date)
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
    const m: Record<string, string> = {}
    for (const e of employees) m[e.id] = e.color
    return m
  }, [employees])

  const aptsByDay = useMemo(() => {
    return weekDays.map((day) =>
      appointments
        .filter((apt) => {
          const aptDate = instanteCitaDesdeTexto(apt.date, timeZone)
          return (
            esMismoDiaCalendarioEnZona(aptDate, day, timeZone) &&
            matchesStatusFilter(apt.status, statusFilter)
          )
        })
        .sort(
          (a, b) =>
            instanteCitaDesdeTexto(a.date, timeZone).getTime() -
            instanteCitaDesdeTexto(b.date, timeZone).getTime()
        )
    )
  }, [appointments, weekDays, timeZone, statusFilter])

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      {/* Cabeceras de días */}
      <View
        style={{
          flexDirection: 'row',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        }}
      >
        {weekDays.map((day, i) => {
          const isToday = esHoyEnZonaIANA(day, timeZone)
          const count = aptsByDay[i]?.length ?? 0
          return (
            <Pressable
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: Spacing.sm,
              }}
              onPress={() => onSelectDay(day)}
            >
              {/* Nombre del día */}
              <ThemedText
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: isToday ? theme.primary : theme.textMuted,
                  textTransform: 'uppercase',
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
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  },
                  isToday && { backgroundColor: theme.primary },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 14,
                    fontWeight: isToday ? '700' : '500',
                    color: isToday ? '#FFFFFF' : theme.text,
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
                    backgroundColor: isToday ? theme.primary + '30' : theme.backgroundSecondary,
                    borderRadius: 8,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    minWidth: 18,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 9,
                      fontWeight: '700',
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
          )
        })}
      </View>

      {/* Cuerpo — columnas */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {weekDays.map((day, i) => {
          const dayApts = aptsByDay[i] ?? []
          const isToday = esHoyEnZonaIANA(day, timeZone)

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
                backgroundColor: isToday ? theme.primary + '08' : 'transparent',
              }}
              onPress={() => onSelectDay(day)}
            >
              {dayApts.length === 0 ? (
                <ThemedText
                  style={{
                    fontSize: 10,
                    color: theme.textMuted,
                    textAlign: 'center',
                    marginTop: Spacing.md,
                    opacity: 0.5,
                  }}
                >
                  —
                </ThemedText>
              ) : (
                dayApts.map((apt) => {
                  const empColor = employeeColorMap[apt.employee_id] ?? theme.primary
                  const svcName = getAppointmentServiceNames(services, apt)
                  const svcCount = getAppointmentServiceCount(apt)
                  const chipTextColor = getContrastTextColor(mixHexColors(empColor, theme.card, 0.5))
                  const chipTextMutedColor = chipTextColor + 'B0'
                  const timeLabel = formatoHoraInstanteEnZona(
                    instanteCitaDesdeTexto(apt.date, timeZone),
                    timeZone,
                    language,
                    timeFormat
                  )

                  return (
                    <Pressable
                      key={apt.id}
                      onPress={(e) => {
                        e.stopPropagation()
                        onOpenDetail(apt)
                      }}
                      style={{
                        borderRadius: WEEK_CHIP_RADIUS,
                        shadowColor: empColor,
                        shadowOpacity: 0.28,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: 2,
                      }}
                    >
                      <LinearGradient
                        colors={[
                          mixHexColors(empColor, theme.card, 0.28),
                          mixHexColors(empColor, theme.card, 0.72),
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          borderRadius: WEEK_CHIP_RADIUS,
                          paddingHorizontal: 4,
                          paddingVertical: 3,
                        }}
                      >
                        {/* Hora */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 2.5,
                              backgroundColor: empColor,
                              marginRight: 3,
                            }}
                          />
                          <ThemedText
                            numberOfLines={1}
                            style={{
                              fontSize: 9,
                              fontWeight: '700',
                              color: chipTextMutedColor,
                            }}
                          >
                            {timeLabel}
                          </ThemedText>
                          {svcCount > 1 && (
                            <View
                              style={{
                                marginLeft: 3,
                                paddingHorizontal: 3,
                                borderRadius: 6,
                                backgroundColor: chipTextColor + '26',
                              }}
                            >
                              <ThemedText
                                style={{ fontSize: 8, fontWeight: '800', color: chipTextColor }}
                              >
                                ×{svcCount}
                              </ThemedText>
                            </View>
                          )}
                          {(apt.reference_image_paths?.length ?? 0) > 0 && (
                            <Feather
                              name="camera"
                              size={9}
                              color={apt.reference_reviewed_at ? chipTextMutedColor : theme.primary}
                              style={{ marginLeft: 3 }}
                            />
                          )}
                        </View>
                        {/* Servicio o cliente */}
                        <ThemedText
                          numberOfLines={1}
                          style={{
                            fontSize: 10,
                            fontWeight: '600',
                            color: chipTextColor,
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
                              color: chipTextMutedColor,
                              marginTop: 1,
                            }}
                          >
                            {apt.client_name}
                          </ThemedText>
                        )}
                      </LinearGradient>
                    </Pressable>
                  )
                })
              )}
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}
