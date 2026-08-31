import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { View, Alert, ActivityIndicator, ScrollView, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { Feather } from '@expo/vector-icons'

import { useTheme } from '@/hooks/useTheme'
import { useResponsive } from '@/hooks/useResponsive'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { Spacing, Shadows } from '@/constants/theme'
import {
  esCeldaAgendaEnHorarioLaboral,
  esInstanteEnHorarioLaboral,
  formatoFechaLargaEnZona,
  formatAppointmentWallclock,
  horaCalendarioEnZona,
  minutosDelDiaEnZona,
  horasVisiblesParaAgenda,
  inicioDiaDelInstanteEnZona,
  inicioDiaHoyEnZonaIANA,
  instanteCitaDesdeTexto,
  instanteCitaEnZona,
  normalizarHorarioSemanal,
  sumarDiasEnZonaIANA,
  sumarSemanasEnZonaIANA,
  zonaIANASegura,
} from '@zmtech/tenant-config'
import type { MainTabParamList } from '@/navigation/MainTabNavigator'

import { agendaStyles as styles } from './agenda/agendaStyles'
import {
  emptyAgendaForm,
  type AgendaAppointment,
  type AgendaFormState,
  type AgendaStatusFilter as AgendaStatusFilterType,
  type OwnerViewMode,
} from './agenda/types'
import { filterAppointmentsForOwnerDay } from './agenda/agendaUtils'
import { useAgendaCalendar } from './agenda/hooks/useAgendaCalendar'
import { useAgendaQueries, useServicesByCategory } from './agenda/hooks/useAgendaQueries'
import { useAgendaMutations } from './agenda/hooks/useAgendaMutations'
import { useAvailabilityCheck } from './agenda/hooks/useAvailabilityCheck'
import { AgendaHeader } from './agenda/components/AgendaHeader'
import { AgendaWeekDayHeaders } from './agenda/components/AgendaWeekDayHeaders'
import { AgendaEmployeeHeaders } from './agenda/components/AgendaEmployeeHeaders'
import { AgendaStatusFilter as AgendaStatusFilterBar } from './agenda/components/AgendaStatusFilter'
import { AgendaCalendarGrid } from './agenda/components/AgendaCalendarGrid'
import { OwnerDayGrid } from './agenda/components/OwnerDayGrid'
import { OwnerWeekGrid } from './agenda/components/OwnerWeekGrid'
import { OwnerStaffAvatarStrip } from './agenda/components/OwnerStaffAvatarStrip'
import { StaffAgendaTimelineView } from './agenda/components/StaffAgendaTimelineView'
import { NewAppointmentModal } from './agenda/components/NewAppointmentModal'
import { AppointmentDetailModal } from './agenda/components/AppointmentDetailModal'
import { AppointmentPreviewModal } from './agenda/components/AppointmentPreviewModal'

export default function AgendaScreen() {
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  const { config } = useTenant()
  const { role, profile, isAdmin, isLoading: authLoading } = useAuth()
  const currencySymbol = config.locale.currency.symbol
  const { isTablet, width } = useResponsive()

  const ownerVista = !authLoading && isAdmin
  const staffVista = !authLoading && role === 'staff'
  const mobileDayMode = !isTablet && (ownerVista || staffVista)

  const timeFormatReloj = config.locale.timeFormat === '12' ? '12' : '24'
  const TIME_COL_W = isTablet ? 72 : 58

  const tenantTz = useMemo(() => zonaIANASegura(config.locale.timezone), [config.locale.timezone])

  const [selectedDate, setSelectedDate] = useState<Date>(() => inicioDiaHoyEnZonaIANA(tenantTz))
  const [ownerViewMode, setOwnerViewMode] = useState<OwnerViewMode>('day')
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [appointmentDetail, setAppointmentDetail] = useState<AgendaAppointment | null>(null)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewAppointment, setPreviewAppointment] = useState<AgendaAppointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null)
  const [rescheduleHour, setRescheduleHour] = useState<number>(10)
  const [rescheduleMinute, setRescheduleMinute] = useState<number>(0)
  const [selectedHour, setSelectedHour] = useState(9)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilterType>('all')
  /** Filtro por columna de empleado (owner día / grid tablet): solo citas de ese id; null = todos */
  const [employeeColumnFilterId, setEmployeeColumnFilterId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AgendaFormState>(emptyAgendaForm())

  const avatarStripRef = useRef<ScrollView>(null)
  const gridScrollRef = useRef<ScrollView>(null)
  const isSyncingFromGrid = useRef(false)
  const isSyncingFromStrip = useRef(false)

  const tzAnteriorRef = useRef(tenantTz)
  useEffect(() => {
    if (tzAnteriorRef.current !== tenantTz) {
      tzAnteriorRef.current = tenantTz
      setSelectedDate(inicioDiaHoyEnZonaIANA(tenantTz))
    }
  }, [tenantTz])

  const { weekDays } = useAgendaCalendar(selectedDate, tenantTz)

  const businessHoursNorm = useMemo(
    () => normalizarHorarioSemanal(config.businessHours),
    [config.businessHours]
  )
  const agendaHours = useMemo(
    () => horasVisiblesParaAgenda(config.businessHours),
    [config.businessHours]
  )

  const {
    appointments,
    isLoading,
    refetch,
    employees,
    employeesLoading,
    employeesError,
    categories,
    services,
    servicesLoading,
    servicesError,
  } = useAgendaQueries()

  const appointmentsDisplayed = useMemo(() => {
    if (!employeeColumnFilterId) return appointments
    return appointments.filter((a) => a.employee_id === employeeColumnFilterId)
  }, [appointments, employeeColumnFilterId])

  /** Citas del día por profesional, respetando el filtro de estado activo — para el badge del avatar strip. */
  const dailyAppointmentCountsByEmployee = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const emp of employees) {
      counts[emp.id] = filterAppointmentsForOwnerDay(
        appointments,
        selectedDate,
        [emp.id],
        statusFilter,
        tenantTz
      ).length
    }
    return counts
  }, [appointments, employees, selectedDate, statusFilter, tenantTz])

  const servicesByCategory = useServicesByCategory(services, formData.categoryId)
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formData.categoryId),
    [categories, formData.categoryId]
  )
  const selectedService = useMemo(
    () => services.find((s) => s.id === formData.serviceId),
    [services, formData.serviceId]
  )
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === formData.employeeId),
    [employees, formData.employeeId]
  )

  const onCreateSuccess = useCallback(() => {
    setModalVisible(false)
    setFormData(emptyAgendaForm())
  }, [])
  const onDeleteSuccess = useCallback(() => {
    setDetailModalVisible(false)
    setAppointmentDetail(null)
  }, [])
  const onUpdateSuccess = useCallback(() => {
    setDetailModalVisible(false)
    setAppointmentDetail(null)
  }, [])

  const { createMutation, deleteAppointmentMutation, updateAppointmentMutation } =
    useAgendaMutations({ onCreateSuccess, onDeleteSuccess, onUpdateSuccess }, tenantTz)

  const route = useRoute<RouteProp<MainTabParamList, 'Agenda'>>()
  const navigation = useNavigation()
  const appointmentIdParam = route.params?.appointmentId

  useEffect(() => {
    if (appointmentIdParam && appointments.length > 0) {
      const apt = appointments.find((a) => a.id === appointmentIdParam)
      if (apt) {
        setAppointmentDetail(apt)
        const aptInst = instanteCitaDesdeTexto(apt.date, tenantTz)
        setRescheduleDate(inicioDiaDelInstanteEnZona(aptInst, tenantTz))
        setRescheduleHour(horaCalendarioEnZona(aptInst, tenantTz))
        setRescheduleMinute(minutosDelDiaEnZona(aptInst, tenantTz) % 60)
        setDetailModalVisible(true)
      }
      ;(
        navigation as unknown as {
          setParams: (p: { appointmentId?: string }) => void
        }
      ).setParams({ appointmentId: undefined })
    }
  }, [appointmentIdParam, appointments, navigation, tenantTz])

  const changeWeek = (delta: number) => {
    setSelectedDate((prev) => sumarSemanasEnZonaIANA(prev, delta, tenantTz))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
  const goToToday = () => {
    setSelectedDate(inicioDiaHoyEnZonaIANA(tenantTz))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
  const changeDay = (delta: number) => {
    setSelectedDate((prev) => sumarDiasEnZonaIANA(prev, delta, tenantTz))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const toggleOwnerViewMode = useCallback(() => {
    setOwnerViewMode((prev) => (prev === 'day' ? 'week' : 'day'))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const handleWeekDaySelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setOwnerViewMode('day')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  useEffect(() => {
    if (ownerVista && ownerViewMode === 'week') {
      setEmployeeColumnFilterId(null)
    }
  }, [ownerVista, ownerViewMode])

  useEffect(() => {
    if (staffVista) setEmployeeColumnFilterId(null)
  }, [staffVista])

  const openNewAppointment = (date: Date, hour: number, minute = 0) => {
    setSelectedDate(date)
    setSelectedHour(hour)
    setSelectedMinute(minute)
    const firstCategoryId = categories[0]?.id ?? ''
    const firstServiceInCategory = firstCategoryId
      ? services.find((s) => s.category_id === firstCategoryId)
      : services[0]
    setFormData({
      clientName: '',
      clientPhone: '',
      clientDocument: '',
      categoryId: firstCategoryId,
      serviceId: firstServiceInCategory?.id ?? '',
      employeeId: employees.length > 0 ? employees[0].id : '',
    })
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleNewAppointmentDateChange = useCallback(
    (d: Date) => {
      setSelectedDate(d)
      if (!esCeldaAgendaEnHorarioLaboral(d, selectedHour, businessHoursNorm, tenantTz)) {
        const first = agendaHours.find((h) =>
          esCeldaAgendaEnHorarioLaboral(d, h, businessHoursNorm, tenantTz)
        )
        if (first !== undefined) setSelectedHour(first)
      }
    },
    [agendaHours, businessHoursNorm, selectedHour, tenantTz]
  )

  const openAppointmentDetail = (apt: AgendaAppointment) => {
    setAppointmentDetail(apt)
    const aptInst = instanteCitaDesdeTexto(apt.date, tenantTz)
    setRescheduleDate(inicioDiaDelInstanteEnZona(aptInst, tenantTz))
    setRescheduleHour(horaCalendarioEnZona(aptInst, tenantTz))
    setRescheduleMinute(minutosDelDiaEnZona(aptInst, tenantTz) % 60)
    setDetailModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const openAppointmentPreview = (apt: AgendaAppointment) => {
    setPreviewAppointment(apt)
    setPreviewModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const closePreviewModal = () => {
    setPreviewModalVisible(false)
    setPreviewAppointment(null)
  }

  const openEditFromPreview = () => {
    if (!previewAppointment) return
    const apt = previewAppointment
    closePreviewModal()
    openAppointmentDetail(apt)
  }

  const handleDeleteAppointment = () => {
    if (!appointmentDetail) return
    Alert.alert('Eliminar cita', `¿Eliminar la cita de ${appointmentDetail.client_name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteAppointmentMutation.mutate(appointmentDetail.id),
      },
    ])
  }

  const handleReschedule = () => {
    if (!appointmentDetail || !rescheduleDate) return
    if (
      !esInstanteEnHorarioLaboral(
        rescheduleDate,
        rescheduleHour * 60 + rescheduleMinute,
        businessHoursNorm,
        tenantTz
      )
    ) {
      Alert.alert('Fuera de horario', 'Ese día u hora está fuera de la franja del negocio.')
      return
    }
    const newDate = instanteCitaEnZona(rescheduleDate, rescheduleHour, tenantTz, rescheduleMinute)
    updateAppointmentMutation.mutate({
      id: appointmentDetail.id,
      date: formatAppointmentWallclock(newDate, tenantTz),
      employee_id: appointmentDetail.employee_id,
      duration: appointmentDetail.duration,
    })
  }

  const handleCreateAppointment = () => {
    if (!formData.clientName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre de la clienta')
      return
    }
    if (!formData.serviceId) {
      Alert.alert('Error', 'Selecciona un servicio')
      return
    }
    if (!formData.employeeId) {
      Alert.alert('Error', `Selecciona ${config.terminology.staffSingular.toLowerCase()}`)
      return
    }
    if (
      !esInstanteEnHorarioLaboral(
        selectedDate,
        selectedHour * 60 + selectedMinute,
        businessHoursNorm,
        tenantTz
      )
    ) {
      Alert.alert('Fuera de horario', 'Esa hora está fuera de la franja configurada.')
      return
    }
    const appointmentDate = instanteCitaEnZona(selectedDate, selectedHour, tenantTz, selectedMinute)
    createMutation.mutate({
      client_name: formData.clientName.trim(),
      client_phone: formData.clientPhone.trim() || undefined,
      client_document: formData.clientDocument.trim() || undefined,
      service_id: formData.serviceId,
      employee_id: formData.employeeId,
      date: formatAppointmentWallclock(appointmentDate, tenantTz),
      duration: selectedService?.duration || 60,
      price: selectedService?.price || '0',
      status: 'scheduled',
    })
  }

  const candidateStartDate = useMemo(() => {
    if (!modalVisible) return null
    return instanteCitaEnZona(selectedDate, selectedHour, tenantTz, selectedMinute)
  }, [modalVisible, selectedDate, selectedHour, selectedMinute, tenantTz])

  const availability = useAvailabilityCheck({
    employeeId: formData.employeeId,
    startDate: candidateStartDate,
    durationMinutes: selectedService?.duration || 60,
    timeZone: tenantTz,
    enabled: modalVisible && !!formData.employeeId && !!formData.serviceId,
    staleTimeMs: 30_000,
  })

  const rescheduleStartDate = useMemo(() => {
    if (!detailModalVisible || !appointmentDetail || !rescheduleDate) return null
    return instanteCitaEnZona(rescheduleDate, rescheduleHour, tenantTz, rescheduleMinute)
  }, [
    appointmentDetail,
    detailModalVisible,
    rescheduleDate,
    rescheduleHour,
    rescheduleMinute,
    tenantTz,
  ])

  const rescheduleAvailability = useAvailabilityCheck({
    employeeId: appointmentDetail?.employee_id ?? '',
    startDate: rescheduleStartDate,
    durationMinutes: appointmentDetail?.duration ?? 60,
    excludeAppointmentId: appointmentDetail?.id ?? null,
    timeZone: tenantTz,
    enabled: detailModalVisible && !!appointmentDetail && !!rescheduleDate,
    staleTimeMs: 30_000,
  })

  const formatDateLabel = useCallback(
    (date: Date) => formatoFechaLargaEnZona(date, config.locale.language, tenantTz),
    [config.locale.language, tenantTz]
  )

  const empColWidth = useMemo(() => {
    const borde =
      Math.max(insets.left, Spacing.xs) + Math.max(insets.right, Spacing.xs) + Spacing.md * 2
    const disponible = width - TIME_COL_W - borde
    const n = Math.max(employees.length, 1)
    return Math.max(104, Math.min(140, disponible / n))
  }, [width, employees.length, TIME_COL_W, insets.left, insets.right])

  const staffNombreMostrado = useMemo(() => {
    const nombre = profile?.full_name?.trim()
    if (nombre) return nombre
    if (profile?.employee_id) {
      const emp = employees.find((e) => e.id === profile.employee_id)
      if (emp?.name) return emp.name
    }
    return config.terminology.staffSingular
  }, [profile?.full_name, profile?.employee_id, employees, config.terminology.staffSingular])

  const openNewAppointmentForStaff = useCallback(() => {
    const primeraHora =
      agendaHours.find((h) =>
        esCeldaAgendaEnHorarioLaboral(selectedDate, h, businessHoursNorm, tenantTz)
      ) ??
      agendaHours[0] ??
      9
    setSelectedHour(primeraHora)
    setSelectedMinute(0)
    const firstCategoryId = categories[0]?.id ?? ''
    const firstServiceInCategory = firstCategoryId
      ? services.find((s) => s.category_id === firstCategoryId)
      : services[0]
    setFormData({
      clientName: '',
      clientPhone: '',
      clientDocument: '',
      categoryId: firstCategoryId,
      serviceId: firstServiceInCategory?.id ?? '',
      employeeId: profile?.employee_id ?? '',
    })
    setModalVisible(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [
    agendaHours,
    selectedDate,
    businessHoursNorm,
    tenantTz,
    categories,
    services,
    profile?.employee_id,
  ])

  /** FAB "+" de la vista owner — abre Nueva Cita sin depender de tocar una celda del grid. */
  const openNewAppointmentQuick = useCallback(() => {
    const primeraHora =
      agendaHours.find((h) =>
        esCeldaAgendaEnHorarioLaboral(selectedDate, h, businessHoursNorm, tenantTz)
      ) ??
      agendaHours[0] ??
      9
    openNewAppointment(selectedDate, primeraHora, 0)
  }, [agendaHours, selectedDate, businessHoursNorm, tenantTz])

  const closeDetailModal = () => {
    setDetailModalVisible(false)
    setAppointmentDetail(null)
  }

  const handleRescheduleDatePick = useCallback(
    (d: Date) => {
      setRescheduleDate(d)
      if (!esCeldaAgendaEnHorarioLaboral(d, rescheduleHour, businessHoursNorm, tenantTz)) {
        const first = agendaHours.find((h) =>
          esCeldaAgendaEnHorarioLaboral(d, h, businessHoursNorm, tenantTz)
        )
        if (first !== undefined) setRescheduleHour(first)
      }
    },
    [agendaHours, businessHoursNorm, rescheduleHour, tenantTz]
  )

  const handleGridScroll = useCallback((x: number) => {
    if (isSyncingFromStrip.current) return
    isSyncingFromGrid.current = true
    avatarStripRef.current?.scrollTo({ x, animated: false })
    requestAnimationFrame(() => {
      isSyncingFromGrid.current = false
    })
  }, [])

  const handleStripScroll = useCallback((x: number) => {
    if (isSyncingFromGrid.current) return
    isSyncingFromStrip.current = true
    gridScrollRef.current?.scrollTo({ x, animated: false })
    requestAnimationFrame(() => {
      isSyncingFromStrip.current = false
    })
  }, [])

  const handleEmployeePress = useCallback(
    (employeeId: string, index: number) => {
      setEmployeeColumnFilterId((prev) => (prev === employeeId ? null : employeeId))
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const x = index * empColWidth
      avatarStripRef.current?.scrollTo({ x, animated: true })
      gridScrollRef.current?.scrollTo({ x, animated: true })
    },
    [empColWidth]
  )

  const handleEmployeeHeaderPress = useCallback((employeeId: string) => {
    setEmployeeColumnFilterId((prev) => (prev === employeeId ? null : employeeId))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingLeft: Math.max(insets.left, Spacing.xs),
          paddingRight: Math.max(insets.right, Spacing.xs),
        },
      ]}
    >
      <AgendaHeader
        isTablet={isTablet}
        mobileDayMode={mobileDayMode}
        ownerViewMode={ownerVista ? ownerViewMode : undefined}
        onToggleOwnerViewMode={ownerVista ? toggleOwnerViewMode : undefined}
        theme={theme}
        language={config.locale.language}
        timeZone={tenantTz}
        selectedDate={selectedDate}
        weekDays={weekDays}
        paddingTop={headerHeight + Spacing.sm}
        onChangeWeek={changeWeek}
        onChangeDay={changeDay}
        onGoToToday={goToToday}
      />

      {authLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : ownerVista ? (
        <>
          {ownerViewMode === 'day' && (
            <View style={{ flexGrow: 0 }}>
              <OwnerStaffAvatarStrip
                employees={employees}
                theme={theme}
                columnWidth={empColWidth}
                scrollRef={avatarStripRef as React.RefObject<ScrollView>}
                onScroll={handleStripScroll}
                onEmployeePress={handleEmployeePress}
                selectedEmployeeId={employeeColumnFilterId}
                appointmentCounts={dailyAppointmentCountsByEmployee}
              />
            </View>
          )}

          <AgendaStatusFilterBar
            statusFilter={statusFilter}
            onChange={setStatusFilter}
            theme={theme}
          />

          {ownerViewMode === 'week' ? (
            <OwnerWeekGrid
              tabBarHeight={tabBarHeight}
              weekDays={weekDays}
              timeZone={tenantTz}
              language={config.locale.language}
              timeFormat={timeFormatReloj}
              appointments={appointmentsDisplayed}
              employees={employees}
              services={services}
              statusFilter={statusFilter}
              isLoading={isLoading}
              onRefresh={refetch}
              theme={{
                primary: theme.primary,
                text: theme.text,
                textSecondary: theme.textSecondary,
                textMuted: theme.textMuted,
                border: theme.border,
                backgroundRoot: theme.backgroundRoot,
                backgroundSecondary: theme.backgroundSecondary,
                card: theme.card,
              }}
              onSelectDay={handleWeekDaySelect}
              onOpenDetail={openAppointmentPreview}
            />
          ) : (
            <OwnerDayGrid
              timeColWidth={TIME_COL_W}
              columnWidth={empColWidth}
              tabBarHeight={tabBarHeight}
              selectedDate={selectedDate}
              agendaHours={agendaHours}
              businessHours={businessHoursNorm}
              timeZone={tenantTz}
              language={config.locale.language}
              timeFormat={timeFormatReloj}
              appointments={appointmentsDisplayed}
              employees={employees}
              services={services}
              statusFilter={statusFilter}
              isLoading={isLoading}
              onRefresh={refetch}
              theme={{
                primary: theme.primary,
                text: theme.text,
                textSecondary: theme.textSecondary,
                textMuted: theme.textMuted,
                border: theme.border,
                backgroundRoot: theme.backgroundRoot,
                backgroundSecondary: theme.backgroundSecondary,
                card: theme.card,
              }}
              onOpenNew={openNewAppointment}
              onOpenDetail={openAppointmentPreview}
              gridScrollRef={gridScrollRef as React.RefObject<ScrollView>}
              onGridScroll={handleGridScroll}
            />
          )}

          <Pressable
            onPress={openNewAppointmentQuick}
            style={[
              {
                position: 'absolute',
                right: Spacing.lg,
                bottom: tabBarHeight + Spacing.md,
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: config.theme.primaryColor,
              },
              Shadows.lg,
            ]}
            accessibilityLabel="Nueva cita"
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        </>
      ) : staffVista ? (
        <StaffAgendaTimelineView
          staffEmployeeId={profile?.employee_id ?? null}
          staffDisplayName={staffNombreMostrado}
          staffSingularLabel={config.terminology.staffSingular.toLowerCase()}
          tabBarHeight={tabBarHeight}
          selectedDate={selectedDate}
          timeZone={tenantTz}
          language={config.locale.language}
          timeFormat={timeFormatReloj}
          appointments={appointments}
          services={services}
          isLoading={isLoading}
          onRefresh={refetch}
          currencySymbol={currencySymbol}
          theme={{
            primary: theme.primary,
            accent: theme.accent,
            text: theme.text,
            textSecondary: theme.textSecondary,
            textMuted: theme.textMuted,
            border: theme.border,
            backgroundRoot: theme.backgroundRoot,
            backgroundSecondary: theme.backgroundSecondary,
            card: theme.card,
            success: theme.success,
            warning: theme.warning,
          }}
          onOpenDetail={openAppointmentPreview}
          onPressNew={openNewAppointmentForStaff}
        />
      ) : (
        <>
          {!isTablet && (
            <AgendaWeekDayHeaders
              weekDays={weekDays}
              timeZone={tenantTz}
              timeColWidth={TIME_COL_W}
              theme={theme}
            />
          )}
          {isTablet && (
            <AgendaEmployeeHeaders
              employees={employees}
              timeColWidth={TIME_COL_W}
              columnWidth={(width - TIME_COL_W - Spacing.md * 2) / Math.max(employees.length, 1)}
              theme={theme}
              selectedEmployeeId={employeeColumnFilterId}
              onEmployeePress={handleEmployeeHeaderPress}
            />
          )}
          <AgendaStatusFilterBar
            statusFilter={statusFilter}
            onChange={setStatusFilter}
            theme={theme}
          />
          <AgendaCalendarGrid
            isTablet={isTablet}
            width={width}
            timeColWidth={TIME_COL_W}
            tabBarHeight={tabBarHeight}
            selectedDate={selectedDate}
            weekDays={weekDays}
            agendaHours={agendaHours}
            businessHours={businessHoursNorm}
            timeZone={tenantTz}
            language={config.locale.language}
            timeFormat={timeFormatReloj}
            appointments={appointmentsDisplayed}
            employees={employees}
            services={services}
            statusFilter={statusFilter}
            isLoading={isLoading}
            onRefresh={refetch}
            theme={{
              primary: theme.primary,
              text: theme.text,
              textSecondary: theme.textSecondary,
              textMuted: theme.textMuted,
              border: theme.border,
              backgroundRoot: theme.backgroundRoot,
            }}
            onOpenNew={openNewAppointment}
            onOpenDetail={openAppointmentPreview}
          />
        </>
      )}

      <NewAppointmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        isTablet={isTablet}
        theme={theme}
        currencySymbol={currencySymbol}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        selectedMinute={selectedMinute}
        agendaHours={agendaHours}
        businessHours={businessHoursNorm}
        timeZone={tenantTz}
        language={config.locale.language}
        timeFormat={timeFormatReloj}
        onChangeDate={handleNewAppointmentDateChange}
        onChangeHour={setSelectedHour}
        onChangeMinute={setSelectedMinute}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        services={services}
        servicesByCategory={servicesByCategory}
        selectedCategory={selectedCategory}
        servicesLoading={servicesLoading}
        servicesError={servicesError}
        employeesLoading={employeesLoading}
        employeesError={employeesError}
        employees={employees}
        selectedService={selectedService}
        selectedEmployee={selectedEmployee}
        formatDateLabel={formatDateLabel}
        onSubmit={handleCreateAppointment}
        createPending={createMutation.isPending}
        availabilityStatus={availability.status}
        isBusy={availability.isBusy}
        busyUntilLabel={availability.busyUntilLabel}
        staffSingular={config.terminology.staffSingular}
        staffPlural={config.terminology.staff}
        clientLabel={config.terminology.client}
      />

      <AppointmentDetailModal
        visible={detailModalVisible}
        onClose={closeDetailModal}
        isTablet={isTablet}
        theme={theme}
        appointment={appointmentDetail}
        services={services}
        agendaHours={agendaHours}
        businessHours={businessHoursNorm}
        timeZone={tenantTz}
        language={config.locale.language}
        timeFormat={timeFormatReloj}
        weekDays={weekDays}
        rescheduleDate={rescheduleDate}
        rescheduleHour={rescheduleHour}
        rescheduleMinute={rescheduleMinute}
        onRescheduleDate={handleRescheduleDatePick}
        onRescheduleHour={setRescheduleHour}
        onRescheduleMinute={setRescheduleMinute}
        onReschedule={handleReschedule}
        onDelete={handleDeleteAppointment}
        updatePending={updateAppointmentMutation.isPending}
        deletePending={deleteAppointmentMutation.isPending}
        availabilityStatus={rescheduleAvailability.status}
        isBusy={rescheduleAvailability.isBusy}
        busyUntilLabel={rescheduleAvailability.busyUntilLabel}
      />

      <AppointmentPreviewModal
        visible={previewModalVisible}
        onClose={closePreviewModal}
        onOpenEdit={openEditFromPreview}
        isTablet={isTablet}
        theme={theme}
        appointment={previewAppointment}
        employees={employees}
        services={services}
        timeZone={tenantTz}
        language={config.locale.language}
        timeFormat={timeFormatReloj}
        currencySymbol={currencySymbol}
      />
    </View>
  )
}
