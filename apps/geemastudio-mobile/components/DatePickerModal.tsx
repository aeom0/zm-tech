import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'
import { DAYS_ES, MONTHS_ES } from '@/constants/dates'
import { isValidIsoDate, toIsoDate } from '@/lib/isoDate'

interface DatePickerModalProps {
  visible: boolean
  onClose: () => void
  /** Fecha seleccionada, 'YYYY-MM-DD'. */
  value: string | null
  onSelect: (iso: string) => void
  /** Límites inclusivos 'YYYY-MM-DD'; los días fuera quedan deshabilitados. */
  minDate?: string
  maxDate?: string
  title?: string
}

type YearMonth = { year: number; month: number }

function monthOf(iso: string | null | undefined): YearMonth | null {
  if (!iso || !isValidIsoDate(iso)) return null
  const [y, m] = iso.split('-').map(Number)
  return { year: y!, month: m! - 1 }
}

function initialMonth(value: string | null, minDate?: string): YearMonth {
  const now = new Date()
  return monthOf(value) ?? monthOf(minDate) ?? { year: now.getFullYear(), month: now.getMonth() }
}

/**
 * Calendario mensual genérico para elegir una fecha de calendario (sin zona horaria).
 * Para agendar citas usar `CalendarPickerModal` de agenda, que además oculta días sin franja.
 */
export function DatePickerModal({
  visible,
  onClose,
  value,
  onSelect,
  minDate,
  maxDate,
  title,
}: DatePickerModalProps) {
  const { theme } = useTheme()
  const [shown, setShown] = useState<YearMonth>(() => initialMonth(value, minDate))

  // Al reabrir, volver al mes de la fecha elegida.
  useResetOnChange([visible], () => {
    if (visible) setShown(initialMonth(value, minDate))
  })

  const weeks = useMemo(() => {
    const daysInMonth = new Date(shown.year, shown.month + 1, 0).getDate()
    const firstWeekday = new Date(shown.year, shown.month, 1).getDay()
    const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const out: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
    return out
  }, [shown])

  const firstOfShown = toIsoDate(shown.year, shown.month, 1)
  const lastOfShown = toIsoDate(
    shown.year,
    shown.month,
    new Date(shown.year, shown.month + 1, 0).getDate()
  )
  const canGoPrev = !minDate || firstOfShown > minDate
  const canGoNext = !maxDate || lastOfShown < maxDate

  const shift = (delta: number) =>
    setShown(({ year, month }) => {
      const total = month + delta
      return { year: year + Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
    })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <ThemedText type="small" style={[styles.title, { color: theme.textMuted }]}>
              {title}
            </ThemedText>
          ) : null}
          <View style={styles.header}>
            <Pressable
              onPress={() => shift(-1)}
              disabled={!canGoPrev}
              accessibilityLabel="Mes anterior"
              hitSlop={8}
              style={[styles.navButton, { opacity: canGoPrev ? 1 : 0.3 }]}
            >
              <Feather name="chevron-left" size={22} color={theme.text} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>
              {MONTHS_ES[shown.month]} {shown.year}
            </ThemedText>
            <Pressable
              onPress={() => shift(1)}
              disabled={!canGoNext}
              accessibilityLabel="Mes siguiente"
              hitSlop={8}
              style={[styles.navButton, { opacity: canGoNext ? 1 : 0.3 }]}
            >
              <Feather name="chevron-right" size={22} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.row}>
            {DAYS_ES.map((label) => (
              <View key={label} style={styles.weekCell}>
                <ThemedText style={[styles.weekLabel, { color: theme.textMuted }]}>
                  {label}
                </ThemedText>
              </View>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={`w-${wi}`} style={styles.row}>
              {week.map((day, di) => {
                if (day === null) return <View key={`b-${wi}-${di}`} style={styles.dayCell} />
                const iso = toIsoDate(shown.year, shown.month, day)
                const enabled = (!minDate || iso >= minDate) && (!maxDate || iso <= maxDate)
                const selected = iso === value
                return (
                  <Pressable
                    key={iso}
                    style={styles.dayCell}
                    disabled={!enabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !enabled }}
                    onPress={() => {
                      onSelect(iso)
                      onClose()
                    }}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        selected && { backgroundColor: theme.primary },
                        !enabled && styles.disabled,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.dayLabel,
                          { color: enabled ? theme.text : theme.textMuted },
                          selected && { color: theme.buttonText, fontWeight: '700' },
                        ]}
                      >
                        {day}
                      </ThemedText>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  title: { textAlign: 'center', marginBottom: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  navButton: { padding: Spacing.xs },
  row: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  weekLabel: { fontSize: 11, fontWeight: '600' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  dayLabel: { fontSize: 14 },
})
