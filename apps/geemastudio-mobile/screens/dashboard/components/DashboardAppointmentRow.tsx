import React from 'react'
import { Pressable, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

import { ThemedText } from '@/components/ThemedText'
import { mixHexColors } from '@/lib/color-hsv'

import { formatDashboardTime } from '../dashboardUtils'
import type { DashboardAppointment } from '../types'
import { dashboardStyles as styles } from '../dashboardStyles'

interface DashboardAppointmentRowProps {
  appointment: DashboardAppointment
  index: number
  visibleCount: number
  isNext?: boolean
  theme: {
    border: string
    primary: string
    text: string
    textSecondary: string
    textMuted: string
    backgroundSecondary: string
    gold: string
  }
  currencySymbol: string
  locale: string
  timeZone: string
  isTablet: boolean
  getEmployeeColor: (employeeId: string) => string
  getEmployeeName: (employeeId: string) => string
  getServiceNames: (appointment: DashboardAppointment) => string
  onPress: (appointment: DashboardAppointment) => void
}

export function DashboardAppointmentRow({
  appointment,
  index,
  visibleCount,
  isNext = false,
  theme,
  currencySymbol,
  locale,
  timeZone,
  isTablet,
  getEmployeeColor,
  getEmployeeName,
  getServiceNames,
  onPress,
}: DashboardAppointmentRowProps) {
  const empColor = getEmployeeColor(appointment.employee_id)
  const isLast = index === visibleCount - 1

  return (
    <Pressable
      style={({ pressed }) => [
        styles.appointmentRow,
        {
          borderBottomColor: theme.border,
          borderBottomWidth: isLast ? 0 : 1,
          borderLeftWidth: 0,
          backgroundColor: isNext
            ? mixHexColors(empColor, theme.backgroundSecondary, 0.9)
            : 'transparent',
        },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => onPress(appointment)}
    >
      <View style={styles.rowTime}>
        <ThemedText style={[styles.rowTimeText, { color: theme.primary }]}>
          {formatDashboardTime(appointment.date, locale, timeZone)}
        </ThemedText>
      </View>

      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: styles.rowDot.marginRight,
          shadowColor: empColor,
          shadowOpacity: 0.5,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      >
        <LinearGradient
          colors={[empColor, mixHexColors(empColor, '#000000', 0.35)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 8, height: 8, borderRadius: 4 }}
        />
      </View>

      <View style={styles.rowInfo}>
        <ThemedText style={[styles.rowClient, { color: theme.text }]} numberOfLines={1}>
          {appointment.client_name}
        </ThemedText>
        <ThemedText style={[styles.rowService, { color: theme.textSecondary }]} numberOfLines={1}>
          {getServiceNames(appointment)}
          {isTablet && ` · ${getEmployeeName(appointment.employee_id)}`}
        </ThemedText>
      </View>

      <View style={styles.rowRight}>
        <ThemedText style={[styles.rowPrice, { color: theme.gold }]}>
          {currencySymbol}
          {parseFloat(String(appointment.price)).toFixed(0)}
        </ThemedText>
        <ThemedText style={[styles.rowDuration, { color: theme.textMuted }]}>
          {appointment.duration}m
        </ThemedText>
      </View>

      <Feather name="chevron-right" size={14} color={theme.textMuted} style={{ marginLeft: 4 }} />
    </Pressable>
  )
}
