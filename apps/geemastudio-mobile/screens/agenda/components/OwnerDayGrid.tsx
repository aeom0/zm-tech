import React, { useMemo } from 'react'
import { View, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing } from '@/constants/theme'
import { mixHexColors, getContrastTextColor } from '@/lib/color-hsv'
import {
  AGENDA_BORDE_VISUAL_MIN,
  esCeldaAgendaEnHorarioLaboral,
  esHoyEnZonaIANA,
  formatoHoraAgendaSlot,
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  minutosDelDiaEnZona,
  type TenantConfig,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import type { AgendaAppointment, AgendaEmployee, AgendaService, AgendaStatusFilter } from '../types'
import {
  computeOverlapLayout,
  filterAppointmentsForOwnerDay,
  getAppointmentServiceNames,
  getAppointmentServiceCount,
} from '../agendaUtils'
import { useAgendaClockTick } from '../hooks/useAgendaClockTick'
import { useSalonHolidays } from '@/hooks/useSalonHolidays'
import { agendaStyles as sharedStyles } from '../agendaStyles'

const APPOINTMENT_CARD_RADIUS = 10
const HOUR_ROW_HEIGHT = 64
const PX_PER_MINUTE = HOUR_ROW_HEIGHT / 60
const EDGE_BUFFER_HEIGHT = AGENDA_BORDE_VISUAL_MIN * PX_PER_MINUTE

interface OwnerDayGridProps {
  timeColWidth: number
  columnWidth: number
  tabBarHeight: number
  selectedDate: Date
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
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
    accent: string
    text: string
    textSecondary: string
    textMuted: string
    border: string
    backgroundRoot: string
    backgroundSecondary: string
    card: string
  }
  onOpenNew: (date: Date, hour: number) => void
  onOpenDetail: (apt: AgendaAppointment) => void
  /** Ref externo del ScrollView horizontal — para sincronizar con el avatar strip */
  gridScrollRef?: React.RefObject<ScrollView>
  onGridScroll?: (x: number) => void
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
    () => Math.min(...agendaHours) * 60 - AGENDA_BORDE_VISUAL_MIN,
    [agendaHours]
  )
  const gridEndMin = useMemo(
    () => Math.max(...agendaHours) * 60 + 60 + AGENDA_BORDE_VISUAL_MIN,
    [agendaHours]
  )
  const totalHeight = agendaHours.length * HOUR_ROW_HEIGHT + EDGE_BUFFER_HEIGHT * 2
  const pxPerMinute = PX_PER_MINUTE

  const isTodayInTz = useMemo(
    () => esHoyEnZonaIANA(selectedDate, timeZone),
    [selectedDate, timeZone]
  )

  const now = useAgendaClockTick(isTodayInTz)
  const { holidayIndex } = useSalonHolidays(true)

  const dayAppointments = useMemo(
    () =>
      filterAppointmentsForOwnerDay(
        appointments,
        selectedDate,
        employees.map((e) => e.id),
        statusFilter,
        timeZone
      ),
    [appointments, selectedDate, employees, statusFilter, timeZone]
  )

  /**
   * Carriles por profesional para citas que se solapan en el tiempo — evita que
   * dos citas concurrentes de la misma columna se dibujen una encima de otra.
   */
  const overlapLayoutByEmployee = useMemo(() => {
    const map = new Map<string, Map<string, { lane: number; laneCount: number }>>()
    for (const emp of employees) {
      const items = dayAppointments
        .filter((apt) => apt.employee_id === emp.id)
        .map((apt) => {
          const start = instanteCitaDesdeTexto(apt.date, timeZone)
          const startMin = minutosDelDiaEnZona(start, timeZone)
          return { id: apt.id, startMin, endMin: startMin + apt.duration }
        })
      map.set(emp.id, computeOverlapLayout(items))
    }
    return map
  }, [employees, dayAppointments, timeZone])

  const nowLineTop = useMemo(() => {
    if (!isTodayInTz) return null
    const m = minutosDelDiaEnZona(now, timeZone)
    if (m < gridStartMin || m > gridEndMin) return null
    return (m - gridStartMin) * pxPerMinute
  }, [isTodayInTz, now, timeZone, gridStartMin, gridEndMin, pxPerMinute])

  const colW = Math.max(columnWidth, 104)
  const totalGridWidth = colW * employees.length

  return (
    <ScrollView
      style={sharedStyles.calendarContainer}
      contentContainerStyle={{
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.md,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        {/* Columna de horas — fija */}
        <View style={{ width: timeColWidth }}>
          <View style={{ height: EDGE_BUFFER_HEIGHT }} />
          {agendaHours.map((hour) => (
            <View
              key={hour}
              style={{
                height: HOUR_ROW_HEIGHT,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border,
                justifyContent: 'flex-start',
                paddingTop: Spacing.xs,
                alignItems: 'center',
              }}
            >
              <ThemedText
                style={{
                  fontSize: 10,
                  color: theme.textMuted,
                  fontWeight: '600',
                }}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {formatoHoraAgendaSlot(selectedDate, hour, timeZone, language, timeFormat)}
              </ThemedText>
            </View>
          ))}
          <View style={{ height: EDGE_BUFFER_HEIGHT }} />
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
          <View
            style={{
              flexDirection: 'row',
              height: totalHeight,
              width: totalGridWidth,
              position: 'relative',
            }}
          >
            {employees.map((emp) => {
              const empApts = dayAppointments.filter((a) => a.employee_id === emp.id)
              const empLaneLayout = overlapLayoutByEmployee.get(emp.id)

              return (
                <View
                  key={emp.id}
                  style={{
                    width: colW,
                    height: totalHeight,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderLeftColor: theme.border,
                    position: 'relative',
                  }}
                >
                  <View
                    style={{
                      height: EDGE_BUFFER_HEIGHT,
                      backgroundColor: theme.backgroundRoot + '99',
                      opacity: 0.45,
                    }}
                  />
                  {agendaHours.map((hour) => {
                    const dentroFila = esCeldaAgendaEnHorarioLaboral(
                      selectedDate,
                      hour,
                      businessHours,
                      timeZone,
                      holidayIndex
                    )
                    return (
                      <View
                        key={hour}
                        style={{
                          height: HOUR_ROW_HEIGHT,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.border,
                          backgroundColor: dentroFila ? 'transparent' : theme.backgroundRoot + '99',
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
                    )
                  })}
                  <View
                    style={{
                      height: EDGE_BUFFER_HEIGHT,
                      backgroundColor: theme.backgroundRoot + '99',
                      opacity: 0.45,
                    }}
                  />

                  {empApts.map((apt) => {
                    const start = instanteCitaDesdeTexto(apt.date, timeZone)
                    const startMin = minutosDelDiaEnZona(start, timeZone)
                    const endMin = startMin + apt.duration
                    const top = Math.max(0, (startMin - gridStartMin) * pxPerMinute)
                    const bottom = (endMin - gridStartMin) * pxPerMinute
                    const height = Math.max(28, Math.min(bottom, totalHeight) - top)
                    if (top >= totalHeight) return null

                    const serviceName = getAppointmentServiceNames(services, apt)
                    const serviceCount = getAppointmentServiceCount(apt)

                    // Carril dentro del cluster de citas solapadas de este profesional —
                    // si hay >1 carril, la cita ocupa solo su fracción del ancho de columna
                    // en vez de pintarse a ancho completo encima de la otra.
                    const { lane, laneCount } = empLaneLayout?.get(apt.id) ?? {
                      lane: 0,
                      laneCount: 1,
                    }
                    const H_MARGIN = 3
                    const LANE_GAP = 3
                    const availableWidth = colW - H_MARGIN * 2
                    const laneWidth =
                      laneCount > 1
                        ? (availableWidth - LANE_GAP * (laneCount - 1)) / laneCount
                        : availableWidth
                    const left = H_MARGIN + lane * (laneWidth + LANE_GAP)
                    const isNarrow = laneCount > 1
                    const cardTextColor = getContrastTextColor(
                      mixHexColors(emp.color, theme.card, 0.5)
                    )
                    const cardTextMutedColor = cardTextColor + 'B0'

                    return (
                      <Pressable
                        key={apt.id}
                        onPress={() => onOpenDetail(apt)}
                        style={{
                          position: 'absolute',
                          left,
                          width: laneWidth,
                          top,
                          height,
                          zIndex: 4,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            borderRadius: APPOINTMENT_CARD_RADIUS,
                            shadowColor: emp.color,
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 3,
                          }}
                        >
                          <LinearGradient
                            colors={[
                              mixHexColors(emp.color, theme.card, 0.28),
                              mixHexColors(emp.color, theme.card, 0.72),
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              flex: 1,
                              padding: isNarrow ? Spacing.xs : Spacing.sm,
                              borderRadius: APPOINTMENT_CARD_RADIUS,
                              overflow: 'hidden',
                            }}
                          >
                            <ThemedText
                              numberOfLines={isNarrow ? 1 : 2}
                              style={{
                                paddingRight: serviceCount > 1 ? 16 : 0,
                                fontSize: isNarrow ? 10 : 11,
                                fontWeight: '700',
                                color: cardTextColor,
                              }}
                            >
                              {serviceName || apt.client_name}
                            </ThemedText>
                            {serviceCount > 1 && (
                              <ThemedText
                                style={{
                                  position: 'absolute',
                                  top: 1,
                                  right: 1,
                                  fontSize: 9,
                                  fontWeight: '800',
                                  color: cardTextMutedColor,
                                }}
                              >
                                ×{serviceCount}
                              </ThemedText>
                            )}
                            {!!serviceName && (
                              <ThemedText
                                numberOfLines={1}
                                style={{
                                  fontSize: isNarrow ? 9 : 10,
                                  marginTop: 2,
                                  color: cardTextMutedColor,
                                }}
                              >
                                {apt.client_name}
                              </ThemedText>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <ThemedText
                                numberOfLines={1}
                                style={{
                                  fontSize: isNarrow ? 8 : 9,
                                  color: cardTextMutedColor,
                                }}
                              >
                                {formatoHoraInstanteEnZona(start, timeZone, language, timeFormat)}
                              </ThemedText>
                              {(apt.reference_image_paths?.length ?? 0) > 0 && (
                                <Feather
                                  name="camera"
                                  size={isNarrow ? 9 : 10}
                                  color={apt.reference_reviewed_at ? cardTextMutedColor : theme.primary}
                                  style={{ marginLeft: Spacing.xs }}
                                />
                              )}
                            </View>
                          </LinearGradient>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )
            })}

            {/* Línea "ahora" — una sola vez, sobre todo el grid */}
            {nowLineTop !== null && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: nowLineTop - 5,
                  height: 10,
                  justifyContent: 'center',
                  zIndex: 12,
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: -3,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.accent,
                    shadowColor: theme.accent,
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 3,
                  }}
                />
                <LinearGradient
                  colors={[theme.accent, `${theme.accent}99`, `${theme.accent}20`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    left: 6,
                    right: 0,
                    height: 1.5,
                    borderRadius: 1,
                  }}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  )
}
