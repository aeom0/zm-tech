import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'

import { DashboardAnimatedView, type DashboardAnimatedStyle } from '../hooks/useStaggeredAnimation'
import { parseAppointmentDate } from '../dashboardUtils'
import type { DashboardAppointment } from '../types'
import { dashboardStyles as styles } from '../dashboardStyles'

import { DashboardAppointmentRow } from './DashboardAppointmentRow'

interface DashboardUpcomingCardProps {
  upcomingAppointments: DashboardAppointment[]
  visibleLimit: number
  upcomingDays: number
  locale: string
  timeZone: string
  currencySymbol: string
  isTablet: boolean
  theme: {
    backgroundDefault: string
    backgroundSecondary: string
    border: string
    primary: string
    text: string
    textSecondary: string
    textMuted: string
    gold: string
  }
  cardAnimatedStyle?: DashboardAnimatedStyle
  getEmployeeColor: (employeeId: string) => string
  getEmployeeName: (employeeId: string) => string
  getServiceName: (serviceId: string) => string
  getDayLabel: (apptDate: Date) => string
  onOpenAppointment: (appointment: DashboardAppointment) => void
  onViewAllAgenda: () => void
}

export function DashboardUpcomingCard({
  upcomingAppointments,
  visibleLimit,
  upcomingDays,
  locale,
  timeZone,
  currencySymbol,
  isTablet,
  theme,
  cardAnimatedStyle,
  getEmployeeColor,
  getEmployeeName,
  getServiceName,
  getDayLabel,
  onOpenAppointment,
  onViewAllAgenda,
}: DashboardUpcomingCardProps) {
  const slice = upcomingAppointments.slice(0, visibleLimit)

  return (
    <DashboardAnimatedView
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        cardAnimatedStyle,
      ]}
    >
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.cardTitle}>Próximas citas</ThemedText>
          <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Próximos {upcomingDays} días
          </ThemedText>
        </View>
        {upcomingAppointments.length > 0 && (
          <View style={[styles.badge, { backgroundColor: `${theme.primary}18` }]}>
            <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
              {upcomingAppointments.length}
            </ThemedText>
          </View>
        )}
      </View>

      {upcomingAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="calendar" size={24} color={theme.textMuted} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            Agenda despejada
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            No hay citas en los próximos {upcomingDays} días
          </ThemedText>
          <Pressable
            style={[styles.emptyActionBtn, { backgroundColor: theme.primary }]}
            onPress={onViewAllAgenda}
          >
            <Feather name="plus" size={14} color="#FFF" />
            <ThemedText style={styles.emptyActionText}>Agendar cita</ThemedText>
          </Pressable>
        </View>
      ) : (
        slice.map((appt, i) => {
          const apptDate = parseAppointmentDate(appt.date, timeZone)
          const prevApptDate = i > 0 ? parseAppointmentDate(slice[i - 1]!.date, timeZone) : null
          const dayLabel = getDayLabel(apptDate)
          const showDayHeader = i === 0 || getDayLabel(prevApptDate!) !== dayLabel

          return (
            <React.Fragment key={appt.id}>
              {showDayHeader && (
                <View
                  style={[
                    styles.dayHeader,
                    i > 0 && localStyles.dayHeaderDivider,
                    i > 0 && { borderTopColor: theme.border },
                  ]}
                >
                  <ThemedText style={[styles.dayHeaderText, { color: theme.textMuted }]}>
                    {dayLabel}
                  </ThemedText>
                </View>
              )}
              <DashboardAppointmentRow
                appointment={appt}
                index={i}
                visibleCount={slice.length}
                isNext={i === 0}
                theme={theme}
                currencySymbol={currencySymbol}
                locale={locale}
                timeZone={timeZone}
                isTablet={isTablet}
                getEmployeeColor={getEmployeeColor}
                getEmployeeName={getEmployeeName}
                getServiceName={getServiceName}
                onPress={onOpenAppointment}
              />
            </React.Fragment>
          )
        })
      )}

      {upcomingAppointments.length > visibleLimit && (
        <Pressable
          style={[styles.viewMoreBtn, { borderTopColor: theme.border }]}
          onPress={onViewAllAgenda}
        >
          <ThemedText style={[styles.viewMoreText, { color: theme.primary }]}>
            Ver todas en Agenda
          </ThemedText>
          <Feather name="arrow-right" size={14} color={theme.primary} />
        </Pressable>
      )}
    </DashboardAnimatedView>
  )
}

const localStyles = StyleSheet.create({
  dayHeaderDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
