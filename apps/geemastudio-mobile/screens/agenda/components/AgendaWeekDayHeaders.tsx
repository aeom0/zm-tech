import React from 'react'
import { View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { BorderRadius } from '@/constants/theme'
import { diaDelMesEnZona, indiceDiaSemanaJSEnZona } from '@zmtech/tenant-config'

import { DAYS_ES } from '../constants'
import { agendaStyles as styles } from '../agendaStyles'
import { isToday } from '../agendaUtils'

interface AgendaWeekDayHeadersProps {
  weekDays: Date[]
  timeZone: string
  timeColWidth: number
  theme: {
    primary: string
    textMuted: string
    border: string
  }
}

export function AgendaWeekDayHeaders({
  weekDays,
  timeZone,
  timeColWidth,
  theme,
}: AgendaWeekDayHeadersProps) {
  return (
    <View style={[styles.dayHeaders, { borderBottomColor: theme.border }]}>
      <View style={[styles.timeColumn, { width: timeColWidth }]} />
      {weekDays.map((date, index) => (
        <View
          key={index}
          style={[
            styles.dayHeader,
            isToday(date, timeZone) && {
              backgroundColor: theme.primary + '12',
              borderRadius: BorderRadius.xs,
            },
          ]}
        >
          <ThemedText style={[styles.dayName, { color: theme.textMuted }]}>
            {DAYS_ES[indiceDiaSemanaJSEnZona(date, timeZone)]}
          </ThemedText>
          <ThemedText
            style={[
              styles.dayNumber,
              isToday(date, timeZone) && {
                color: theme.primary,
                fontWeight: '700',
              },
            ]}
          >
            {diaDelMesEnZona(date, timeZone)}
          </ThemedText>
        </View>
      ))}
    </View>
  )
}
