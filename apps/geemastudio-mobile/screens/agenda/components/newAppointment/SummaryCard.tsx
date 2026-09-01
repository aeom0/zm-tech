import React from 'react'
import { View } from 'react-native'

import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/theme'

import { computeServiceLinesTotals, lineUnitPrice } from '../../agendaUtils'
import type { AgendaEmployee, AgendaService, AgendaServiceLine } from '../../types'
import { agendaStyles as styles } from '../../agendaStyles'
import type { NewAppointmentModalTheme } from './modalTheme'

interface SummaryCardProps {
  theme: NewAppointmentModalTheme
  currencySymbol: string
  serviceLines: AgendaServiceLine[]
  services: AgendaService[]
  employees: AgendaEmployee[]
  staffSingular: string
}

export function SummaryCard({
  theme,
  currencySymbol,
  serviceLines,
  services,
  employees,
  staffSingular,
}: SummaryCardProps) {
  const { totalPrice, totalDuration } = computeServiceLinesTotals(serviceLines, services)

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <ThemedText style={[styles.summaryTitle, { color: theme.textSecondary }]}>
        Resumen de la cita
      </ThemedText>

      {serviceLines.map((line, idx) => {
        const service = services.find((s) => s.id === line.serviceId)
        const employee = employees.find((e) => e.id === line.employeeId)
        const price = lineUnitPrice(line, services)
        return (
          <View key={`${line.serviceId}-${idx}`} style={styles.summaryLineRow}>
            <View style={styles.summaryLineInfo}>
              <ThemedText style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>
                {service?.name || '—'}
              </ThemedText>
              <View style={styles.summaryEmployeeRow}>
                <View style={[styles.summaryDot, { backgroundColor: employee?.color }]} />
                <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>
                  {employee?.name.split(' ')[0] || staffSingular}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
              {currencySymbol} {price.toFixed(2)}
            </ThemedText>
          </View>
        )
      })}

      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>Duración</ThemedText>
        <ThemedText style={[styles.summaryValue, { color: theme.text }]}>
          {totalDuration || 60} min
        </ThemedText>
      </View>
      <View style={[styles.summaryRow, styles.summaryRowLast]}>
        <ThemedText style={[styles.summaryLabel, { color: theme.textMuted }]}>Total</ThemedText>
        <ThemedText style={[styles.summaryPrice, { color: Colors.light.gold }]}>
          {currencySymbol} {totalPrice.toFixed(2)}
        </ThemedText>
      </View>
    </View>
  )
}
