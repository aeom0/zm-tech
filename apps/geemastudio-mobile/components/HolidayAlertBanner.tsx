import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing, BorderRadius } from '@/constants/theme'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import {
  formatHolidayAlertTitle,
  getUpcomingHolidayAlerts,
  dateKeyEnZona,
  zonaIANASegura,
} from '@zmtech/tenant-config'
import { useSalonHolidays } from '@/hooks/useSalonHolidays'

interface Props {
  withinDays?: number
  onPress?: () => void
  embedded?: boolean
}

export function HolidayAlertBanner({ withinDays = 3, onPress, embedded }: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const { holidayIndex } = useSalonHolidays(true)

  const alerts = useMemo(() => {
    const today = dateKeyEnZona(new Date(), zonaIANASegura(config.locale.timezone))
    return getUpcomingHolidayAlerts(today, holidayIndex, withinDays)
  }, [holidayIndex, withinDays, config.locale.timezone])

  if (alerts.length === 0) return null

  const primary = alerts[0]
  const extra =
    alerts.length > 1
      ? ` (+${alerts.length - 1} feriado${alerts.length > 2 ? 's' : ''} más)`
      : ''

  const content = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}20` }]}>
        <Feather name="calendar" size={16} color={theme.primary} />
      </View>
      <View style={styles.textWrap}>
        <ThemedText style={[styles.title, { color: theme.primary }]}>
          {formatHolidayAlertTitle(primary)}
          {extra}
        </ThemedText>
        <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
          {primary.scheduleHint}. Revisá la agenda antes de agendar citas.
        </ThemedText>
      </View>
      {onPress ? <Feather name="chevron-right" size={18} color={theme.textMuted} /> : null}
    </>
  )

  const boxStyle = [
    styles.box,
    {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
      marginHorizontal: embedded ? 0 : Spacing.lg,
    },
  ]

  if (onPress) {
    return (
      <Pressable style={boxStyle} onPress={onPress}>
        {content}
      </Pressable>
    )
  }
  return <View style={boxStyle}>{content}</View>
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700' },
  body: { fontSize: 12, marginTop: 2, lineHeight: 16 },
})
