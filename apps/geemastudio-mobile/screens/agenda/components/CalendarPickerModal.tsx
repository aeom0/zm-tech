import React, { useMemo, useState } from 'react'
import { View, Modal, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { BorderRadius, Colors, Spacing } from '@/constants/theme'

import type { TenantConfig } from '@zmtech/tenant-config'
import type { SalonHolidayIndex } from '@zmtech/tenant-config'
import {
  diaTieneFranjaAgenda,
  esMismoDiaCalendarioEnZona,
  inicioDiaHoyEnZonaIANA,
  sumarDiasEnZonaIANA,
} from '@zmtech/tenant-config'

import { DAYS_ES, MONTHS_ES } from '../constants'

/** Cuántos meses hacia adelante puede navegar el calendario (incluye el mes actual). */
const MESES_VISIBLES = 12

interface CalendarPickerTheme {
  backgroundDefault: string
  backgroundSecondary: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  primary: string
}

interface CalendarPickerModalProps {
  visible: boolean
  onClose: () => void
  selectedDate: Date
  onSelectDate: (d: Date) => void
  theme: CalendarPickerTheme
  timeZone: string
  agendaHours: number[]
  businessHours: TenantConfig['businessHours']
  holidayIndex?: SalonHolidayIndex
}

interface CalendarCell {
  day: number
  offset: number
  isPast: boolean
  isSelectable: boolean
}

/** Diferencia en días calendario entre dos fechas Y-M-D (puramente numérica, sin husos horarios). */
function calendarDayOffset(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number }
): number {
  const fromUTC = Date.UTC(from.year, from.month, from.day)
  const toUTC = Date.UTC(to.year, to.month, to.day)
  return Math.round((toUTC - fromUTC) / 86_400_000)
}

/**
 * Calendario mensual reutilizable para seleccionar una fecha futura, omitiendo
 * (deshabilitando) días pasados y días sin franja de agenda disponible
 * (feriados o fuera de horario laboral).
 */
export function CalendarPickerModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  theme,
  timeZone,
  agendaHours,
  businessHours,
  holidayIndex,
}: CalendarPickerModalProps) {
  const hoy = useMemo(() => inicioDiaHoyEnZonaIANA(timeZone), [timeZone])
  const hoyYMD = useMemo(
    () => ({
      year: hoy.getFullYear(),
      month: hoy.getMonth(),
      day: hoy.getDate(),
    }),
    [hoy]
  )

  const [monthOffset, setMonthOffset] = useState(0)

  const { displayYear, displayMonth } = useMemo(() => {
    const total = hoyYMD.month + monthOffset
    const year = hoyYMD.year + Math.floor(total / 12)
    const month = ((total % 12) + 12) % 12
    return { displayYear: year, displayMonth: month }
  }, [hoyYMD, monthOffset])

  const cells = useMemo<(CalendarCell | null)[]>(() => {
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
    const firstWeekday = new Date(displayYear, displayMonth, 1).getDay()

    const out: (CalendarCell | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      const offset = calendarDayOffset(hoyYMD, { year: displayYear, month: displayMonth, day })
      const isPast = offset < 0
      out.push({ day, offset, isPast, isSelectable: false })
    }
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [displayYear, displayMonth, hoyYMD])

  const weeks = useMemo(() => {
    const out: (CalendarCell | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
    return out
  }, [cells])

  const canGoPrev = monthOffset > 0
  const canGoNext = monthOffset < MESES_VISIBLES - 1

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => canGoPrev && setMonthOffset((m) => m - 1)}
              disabled={!canGoPrev}
              style={[styles.navButton, { opacity: canGoPrev ? 1 : 0.3 }]}
            >
              <Feather name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              {MONTHS_ES[displayMonth]} {displayYear}
            </ThemedText>
            <Pressable
              onPress={() => canGoNext && setMonthOffset((m) => m + 1)}
              disabled={!canGoNext}
              style={[styles.navButton, { opacity: canGoNext ? 1 : 0.3 }]}
            >
              <Feather name="chevron-right" size={20} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {DAYS_ES.map((label) => (
              <View key={label} style={styles.weekCell}>
                <ThemedText style={[styles.weekLabel, { color: theme.textMuted }]}>
                  {label}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {weeks.map((week, weekIdx) => (
              <View key={`week-${weekIdx}`} style={styles.weekGridRow}>
                {week.map((cell, idx) => {
                  if (!cell) return <View key={`blank-${weekIdx}-${idx}`} style={styles.dayCell} />

                  const cellDate = sumarDiasEnZonaIANA(hoy, cell.offset, timeZone)
                  const diaConFranja = diaTieneFranjaAgenda(
                    cellDate,
                    agendaHours,
                    businessHours,
                    timeZone,
                    holidayIndex
                  )
                  const isSelectable = !cell.isPast && diaConFranja
                  const isSelected = esMismoDiaCalendarioEnZona(cellDate, selectedDate, timeZone)

                  return (
                    <Pressable
                      key={cell.day}
                      style={styles.dayCell}
                      disabled={!isSelectable}
                      onPress={() => {
                        if (isSelectable) {
                          onSelectDate(cellDate)
                          onClose()
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          isSelected && { backgroundColor: theme.primary },
                          !isSelectable && !isSelected && styles.dayCircleDisabled,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.dayLabel,
                            { color: isSelectable ? theme.text : theme.textMuted },
                            isSelected && { color: Colors.light.buttonText, fontWeight: '700' },
                          ]}
                        >
                          {cell.day}
                        </ThemedText>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  navButton: {
    padding: Spacing.xs,
  },
  closeButton: {
    marginLeft: Spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'column',
  },
  weekGridRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDisabled: {
    opacity: 0.35,
  },
  dayLabel: {
    fontSize: 13,
  },
})
