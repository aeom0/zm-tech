import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import React, { useMemo, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ThemedText } from '@/components/ThemedText'
import { Colors, Spacing } from '@/constants/theme'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useAppointmentCompletion } from '@/hooks/useAppointmentCompletion'
import { useHaptics } from '@/hooks/useHaptics'
import { useResponsive } from '@/hooks/useResponsive'
import { useTheme } from '@/hooks/useTheme'
import type { MainTabParamList } from '@/navigation/MainTabNavigator'
import {
  formatAppointmentWallclock,
  inicioDiaHoyEnZonaIANA,
  sumarDiasEnZonaIANA,
  zonaIANASegura,
} from '@zmtech/tenant-config'

import { DashboardAppointmentModal } from './dashboard/components/DashboardAppointmentModal'
import { DashboardHeader } from './dashboard/components/DashboardHeader'
import { DashboardLoading } from './dashboard/components/DashboardLoading'
import { DashboardLowStockBanner } from './dashboard/components/DashboardLowStockBanner'
import { DashboardQuickLinksCard } from './dashboard/components/DashboardQuickLinksCard'
import { DashboardStatCard } from './dashboard/components/DashboardStatCard'
import { DashboardUpcomingCard } from './dashboard/components/DashboardUpcomingCard'
import { dashboardStyles as styles } from './dashboard/dashboardStyles'
import {
  formatDashboardDateLong,
  formatUpcomingDayLabel,
  getGreeting,
  parseAppointmentDate,
} from './dashboard/dashboardUtils'
import { useDashboardMutations } from './dashboard/hooks/useDashboardMutations'
import { useDashboardQueries } from './dashboard/hooks/useDashboardQueries'
import { useStaggeredAnimation } from './dashboard/hooks/useStaggeredAnimation'
import type { DashboardAppointment } from './dashboard/types'

/** Ventana de la card "Próximas citas" (hoy + N-1 días siguientes). */
const UPCOMING_DAYS = 3

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const { theme, isDark } = useTheme()
  const { isTablet } = useResponsive()
  const haptics = useHaptics()
  const { profile, isAdmin } = useAuth()
  const { config } = useTenant()
  const currencySymbol = config.locale.currency.symbol
  const tenantTz = zonaIANASegura(config.locale.timezone)

  const { startOfDay, statsEndOfDay, appointmentsEndOfDay, today, tomorrow } = useMemo(() => {
    const start = inicioDiaHoyEnZonaIANA(tenantTz)
    const nextDay = sumarDiasEnZonaIANA(start, 1, tenantTz)
    const rangeEnd = sumarDiasEnZonaIANA(start, UPCOMING_DAYS, tenantTz)
    return {
      startOfDay: formatAppointmentWallclock(start, tenantTz),
      statsEndOfDay: formatAppointmentWallclock(new Date(nextDay.getTime() - 1000), tenantTz),
      appointmentsEndOfDay: formatAppointmentWallclock(
        new Date(rangeEnd.getTime() - 1000),
        tenantTz
      ),
      today: start,
      tomorrow: nextDay,
    }
  }, [tenantTz])

  const {
    stats,
    statsLoading,
    refetchStats,
    appointments,
    appointmentsLoading,
    refetchAppointments,
    employees,
    services,
    paymentsByAppointment,
  } = useDashboardQueries(startOfDay, statsEndOfDay, appointmentsEndOfDay)

  const { updateAppointmentMutation, createPaymentMutation } = useDashboardMutations()

  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Dashboard'>>()
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<DashboardAppointment | null>(null)

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    return service?.name ?? 'Servicio'
  }

  const getDayLabel = (apptDate: Date) =>
    formatUpcomingDayLabel(apptDate, today, tomorrow, config.locale.language, tenantTz)

  const {
    payMethodVisible,
    pendingPayMethod,
    setPendingPayMethod,
    handleMarkCompleted,
    confirmCompleteWithMethod,
    cancelPayMethod,
    isCompleting,
  } = useAppointmentCompletion<DashboardAppointment>({
    updateAppointmentMutation,
    createPaymentMutation,
    paymentsByAppointment,
    getServiceName,
    onCompleted: () => {
      setModalVisible(false)
      setSelectedAppointment(null)
      void refetchStats()
      void refetchAppointments()
      haptics.success()
    },
  })

  const handleEditInAgenda = (appointment: DashboardAppointment) => {
    cancelPayMethod()
    setModalVisible(false)
    setSelectedAppointment(null)
    navigation.navigate('Agenda', { appointmentId: appointment.id })
  }

  const isLoading = statsLoading || appointmentsLoading

  const onRefresh = async () => {
    haptics.light()
    await Promise.all([refetchStats(), refetchAppointments()])
  }

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId)
    return employee?.name ?? 'Sin asignar'
  }

  const getEmployeeColor = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId)
    return employee?.color ?? Colors.light.violet
  }

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'scheduled')
      .sort(
        (a, b) =>
          parseAppointmentDate(a.date, tenantTz).getTime() -
          parseAppointmentDate(b.date, tenantTz).getTime()
      )
  }, [appointments, tenantTz])

  const completedToday = useMemo(
    () => appointments.filter((a) => a.status === 'completed'),
    [appointments]
  )

  const animatedItems = useStaggeredAnimation(isLoading)

  const visibleLimit = isTablet ? 8 : 5

  const greeting = getGreeting()
  const displayNameSuffix = profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''
  const dateLabel = formatDashboardDateLong(config.locale.language, tenantTz)

  if (isLoading) {
    return <DashboardLoading backgroundColor={theme.backgroundRoot} />
  }

  const statsRow = (
    <View>
      <ThemedText style={[styles.sectionLabel, { color: theme.textMuted }]}>
        Resumen de hoy
      </ThemedText>
      <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
        <DashboardStatCard
          icon="dollar-sign"
          label="Ingresos hoy"
          value={`${currencySymbol}${stats?.todayRevenue?.toFixed(0) ?? '0'}`}
          color={theme.gold}
          subtitle={completedToday.length > 0 ? `${completedToday.length} pagos` : undefined}
          style={animatedItems[1]}
          isTablet={isTablet}
          theme={{
            backgroundDefault: theme.backgroundDefault,
            border: theme.border,
            textSecondary: theme.textSecondary,
            textMuted: theme.textMuted,
          }}
          onPress={
            isAdmin
              ? () => {
                  haptics.light()
                  navigation.navigate('More', { screen: 'Finanzas' } as never)
                }
              : undefined
          }
        />
        <DashboardStatCard
          icon="check-circle"
          label="Completadas"
          value={stats?.completedAppointments ?? 0}
          color={theme.success}
          style={animatedItems[2]}
          isTablet={isTablet}
          theme={{
            backgroundDefault: theme.backgroundDefault,
            border: theme.border,
            textSecondary: theme.textSecondary,
            textMuted: theme.textMuted,
          }}
          onPress={() => {
            haptics.light()
            navigation.navigate('Agenda', {})
          }}
        />
        <DashboardStatCard
          icon="clock"
          label="Pendientes"
          value={stats?.upcomingAppointments ?? 0}
          color={theme.primary}
          style={animatedItems[3]}
          isTablet={isTablet}
          theme={{
            backgroundDefault: theme.backgroundDefault,
            border: theme.border,
            textSecondary: theme.textSecondary,
            textMuted: theme.textMuted,
          }}
          onPress={() => {
            haptics.light()
            navigation.navigate('Agenda', {})
          }}
        />
      </View>
    </View>
  )

  const lowStockBanner =
    stats && stats.lowStockItems > 0 ? (
      <DashboardLowStockBanner
        count={stats.lowStockItems}
        isDark={isDark}
        theme={{ gold: theme.gold, textSecondary: theme.textSecondary }}
        animatedStyle={animatedItems[4]}
      />
    ) : null

  const quickLinksCard = isAdmin ? (
    <DashboardQuickLinksCard
      theme={{
        backgroundDefault: theme.backgroundDefault,
        border: theme.border,
        primary: theme.primary,
        gold: theme.gold,
        text: theme.text,
        textSecondary: theme.textSecondary,
        textMuted: theme.textMuted,
      }}
      animatedStyle={animatedItems[6]}
      onOpenClients={() => {
        haptics.light()
        navigation.navigate('Clients')
      }}
      onOpenFinances={() => {
        haptics.light()
        navigation.navigate('More', { screen: 'Finanzas' } as never)
      }}
    />
  ) : null

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: isTablet ? Spacing['2xl'] : Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.light.violet} />
      }
      showsVerticalScrollIndicator={false}
    >
      <DashboardHeader
        greeting={greeting}
        displayNameSuffix={displayNameSuffix}
        dateLabel={dateLabel}
        businessInitials={config.businessName.slice(0, 2).toUpperCase()}
        primaryColor={config.theme.primaryColor}
        theme={{ text: theme.text, textSecondary: theme.textSecondary }}
        animatedStyle={animatedItems[5]}
      />

      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletLeft}>
            <DashboardUpcomingCard
              upcomingAppointments={upcomingAppointments}
              visibleLimit={visibleLimit}
              upcomingDays={UPCOMING_DAYS}
              locale={config.locale.language}
              timeZone={tenantTz}
              currencySymbol={currencySymbol}
              isTablet={isTablet}
              theme={{
                backgroundDefault: theme.backgroundDefault,
                backgroundSecondary: theme.backgroundSecondary,
                border: theme.border,
                primary: theme.primary,
                text: theme.text,
                textSecondary: theme.textSecondary,
                textMuted: theme.textMuted,
                gold: theme.gold,
              }}
              cardAnimatedStyle={animatedItems[0]}
              getEmployeeColor={getEmployeeColor}
              getEmployeeName={getEmployeeName}
              getServiceName={getServiceName}
              getDayLabel={getDayLabel}
              onOpenAppointment={(appt) => {
                setSelectedAppointment(appt)
                setModalVisible(true)
                haptics.light()
              }}
              onViewAllAgenda={() => navigation.navigate('Agenda', {})}
            />
            {quickLinksCard ? <View style={{ height: Spacing.lg }} /> : null}
            {quickLinksCard}
          </View>
          <View style={styles.tabletRight}>
            {statsRow}
            {lowStockBanner}
          </View>
        </View>
      ) : (
        <>
          {statsRow}
          <View style={{ height: Spacing.lg }} />
          <DashboardUpcomingCard
            upcomingAppointments={upcomingAppointments}
            visibleLimit={visibleLimit}
            upcomingDays={UPCOMING_DAYS}
            locale={config.locale.language}
            timeZone={tenantTz}
            currencySymbol={currencySymbol}
            isTablet={isTablet}
            theme={{
              backgroundDefault: theme.backgroundDefault,
              backgroundSecondary: theme.backgroundSecondary,
              border: theme.border,
              primary: theme.primary,
              text: theme.text,
              textSecondary: theme.textSecondary,
              textMuted: theme.textMuted,
              gold: theme.gold,
            }}
            cardAnimatedStyle={animatedItems[0]}
            getEmployeeColor={getEmployeeColor}
            getEmployeeName={getEmployeeName}
            getServiceName={getServiceName}
            getDayLabel={getDayLabel}
            onOpenAppointment={(appt) => {
              setSelectedAppointment(appt)
              setModalVisible(true)
              haptics.light()
            }}
            onViewAllAgenda={() => navigation.navigate('Agenda', {})}
          />
          {lowStockBanner ? <View style={{ height: Spacing.lg }} /> : null}
          {lowStockBanner}
          {quickLinksCard ? <View style={{ height: Spacing.lg }} /> : null}
          {quickLinksCard}
        </>
      )}

      <DashboardAppointmentModal
        visible={modalVisible}
        appointment={selectedAppointment}
        isTablet={isTablet}
        currencySymbol={currencySymbol}
        locale={config.locale.language}
        timeZone={tenantTz}
        theme={{
          backgroundDefault: theme.backgroundDefault,
          backgroundSecondary: theme.backgroundSecondary,
          border: theme.border,
          text: theme.text,
          textSecondary: theme.textSecondary,
          primary: theme.primary,
          gold: theme.gold,
          success: theme.success,
        }}
        getServiceName={getServiceName}
        isCompleting={isCompleting}
        payMethodVisible={payMethodVisible}
        pendingPayMethod={pendingPayMethod}
        onSelectPayMethod={setPendingPayMethod}
        onCancelPayMethod={cancelPayMethod}
        onConfirmPayMethod={confirmCompleteWithMethod}
        onClose={() => {
          cancelPayMethod()
          setModalVisible(false)
          setSelectedAppointment(null)
        }}
        onMarkCompleted={handleMarkCompleted}
        onEditInAgenda={handleEditInAgenda}
      />
    </ScrollView>
  )
}
