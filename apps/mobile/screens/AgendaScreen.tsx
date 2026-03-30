import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { View, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useTenant } from "@/contexts/TenantContext";
import { Spacing } from "@/constants/theme";
import {
  defaultTenantConfig,
  esCeldaAgendaEnHorarioLaboral,
  formatoFechaLargaEnZona,
  horaCalendarioEnZona,
  horasVisiblesParaAgenda,
  inicioDiaDelInstanteEnZona,
  inicioDiaHoyEnZonaIANA,
  instanteCitaEnZona,
  normalizarHorarioSemanal,
  sumarDiasEnZonaIANA,
  sumarSemanasEnZonaIANA,
  zonaIANASegura,
} from "@salonpro/tenant-config";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

import { agendaStyles as styles } from "./agenda/agendaStyles";
import {
  emptyAgendaForm,
  type AgendaAppointment,
  type AgendaFormState,
  type AgendaStatusFilter as AgendaStatusFilterType,
} from "./agenda/types";
import { useAgendaCalendar } from "./agenda/hooks/useAgendaCalendar";
import {
  useAgendaQueries,
  useServicesByCategory,
} from "./agenda/hooks/useAgendaQueries";
import { useAgendaMutations } from "./agenda/hooks/useAgendaMutations";
import { useAvailabilityCheck } from "./agenda/hooks/useAvailabilityCheck";
import { AgendaHeader } from "./agenda/components/AgendaHeader";
import { AgendaWeekDayHeaders } from "./agenda/components/AgendaWeekDayHeaders";
import { AgendaEmployeeHeaders } from "./agenda/components/AgendaEmployeeHeaders";
import { AgendaStatusFilter as AgendaStatusFilterBar } from "./agenda/components/AgendaStatusFilter";
import { AgendaCalendarGrid } from "./agenda/components/AgendaCalendarGrid";
import { NewAppointmentModal } from "./agenda/components/NewAppointmentModal";
import { AppointmentDetailModal } from "./agenda/components/AppointmentDetailModal";

export default function AgendaScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();
  const currencySymbol = config.locale.currency.symbol;
  const { isTablet, width } = useResponsive();

  const TIME_COL_W = isTablet ? 64 : 50;

  const tenantTz = useMemo(
    () => zonaIANASegura(config.locale.timezone),
    [config.locale.timezone],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    inicioDiaHoyEnZonaIANA(
      zonaIANASegura(defaultTenantConfig.locale.timezone),
    ),
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [appointmentDetail, setAppointmentDetail] =
    useState<AgendaAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleHour, setRescheduleHour] = useState<number>(10);
  const [selectedHour, setSelectedHour] = useState(9);
  const [statusFilter, setStatusFilter] =
    useState<AgendaStatusFilterType>("all");
  const [formData, setFormData] = useState<AgendaFormState>(emptyAgendaForm());

  const tzAnteriorRef = useRef(tenantTz);
  useEffect(() => {
    if (tzAnteriorRef.current !== tenantTz) {
      tzAnteriorRef.current = tenantTz;
      setSelectedDate(inicioDiaHoyEnZonaIANA(tenantTz));
    }
  }, [tenantTz]);

  const { weekDays } = useAgendaCalendar(selectedDate, tenantTz);

  const businessHoursNorm = useMemo(
    () => normalizarHorarioSemanal(config.businessHours),
    [config.businessHours],
  );

  const agendaHours = useMemo(
    () => horasVisiblesParaAgenda(config.businessHours),
    [config.businessHours],
  );

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
  } = useAgendaQueries();

  const servicesByCategory = useServicesByCategory(
    services,
    formData.categoryId,
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formData.categoryId),
    [categories, formData.categoryId],
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === formData.serviceId),
    [services, formData.serviceId],
  );
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === formData.employeeId),
    [employees, formData.employeeId],
  );

  const onCreateSuccess = useCallback(() => {
    setModalVisible(false);
    setFormData(emptyAgendaForm());
  }, []);

  const onDeleteSuccess = useCallback(() => {
    setDetailModalVisible(false);
    setAppointmentDetail(null);
  }, []);

  const onUpdateSuccess = useCallback(() => {
    setDetailModalVisible(false);
    setAppointmentDetail(null);
  }, []);

  const {
    createMutation,
    deleteAppointmentMutation,
    updateAppointmentMutation,
  } = useAgendaMutations({
    onCreateSuccess,
    onDeleteSuccess,
    onUpdateSuccess,
  });

  const route = useRoute<RouteProp<MainTabParamList, "Agenda">>();
  const navigation = useNavigation();
  const appointmentIdParam = route.params?.appointmentId;

  useEffect(() => {
    if (appointmentIdParam && appointments.length > 0) {
      const apt = appointments.find((a) => a.id === appointmentIdParam);
      if (apt) {
        setAppointmentDetail(apt);
        const aptInst = new Date(apt.date);
        setRescheduleDate(inicioDiaDelInstanteEnZona(aptInst, tenantTz));
        setRescheduleHour(horaCalendarioEnZona(aptInst, tenantTz));
        setDetailModalVisible(true);
      }
      (
        navigation as unknown as {
          setParams: (p: { appointmentId?: string }) => void;
        }
      ).setParams({ appointmentId: undefined });
    }
  }, [appointmentIdParam, appointments, navigation, tenantTz]);

  const changeWeek = (delta: number) => {
    setSelectedDate((prev) => sumarSemanasEnZonaIANA(prev, delta, tenantTz));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goToToday = () => {
    setSelectedDate(inicioDiaHoyEnZonaIANA(tenantTz));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const changeDay = (delta: number) => {
    setSelectedDate((prev) => sumarDiasEnZonaIANA(prev, delta, tenantTz));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openNewAppointment = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    const firstCategoryId = categories[0]?.id ?? "";
    const firstServiceInCategory = firstCategoryId
      ? services.find((s) => s.category_id === firstCategoryId)
      : services[0];
    setFormData({
      clientName: "",
      clientPhone: "",
      clientDocument: "",
      categoryId: firstCategoryId,
      serviceId: firstServiceInCategory?.id ?? "",
      employeeId: employees.length > 0 ? employees[0].id : "",
    });
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openAppointmentDetail = (apt: AgendaAppointment) => {
    setAppointmentDetail(apt);
    const aptInst = new Date(apt.date);
    setRescheduleDate(inicioDiaDelInstanteEnZona(aptInst, tenantTz));
    setRescheduleHour(horaCalendarioEnZona(aptInst, tenantTz));
    setDetailModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteAppointment = () => {
    if (!appointmentDetail) return;
    Alert.alert(
      "Eliminar cita",
      `¿Eliminar la cita de ${appointmentDetail.client_name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteAppointmentMutation.mutate(appointmentDetail.id),
        },
      ],
    );
  };

  const handleReschedule = () => {
    if (!appointmentDetail || !rescheduleDate) return;
    if (
      !esCeldaAgendaEnHorarioLaboral(
        rescheduleDate,
        rescheduleHour,
        businessHoursNorm,
        tenantTz,
      )
    ) {
      Alert.alert(
        "Fuera de horario",
        "Ese día u hora está fuera de la franja del negocio. Elige otra opción o actualiza el horario en Configuración.",
      );
      return;
    }
    const newDate = instanteCitaEnZona(
      rescheduleDate,
      rescheduleHour,
      tenantTz,
    );
    updateAppointmentMutation.mutate({
      id: appointmentDetail.id,
      date: newDate.toISOString(),
      employee_id: appointmentDetail.employee_id,
      duration: appointmentDetail.duration,
    });
  };

  const handleCreateAppointment = () => {
    if (!formData.clientName.trim()) {
      Alert.alert("Error", "Ingresa el nombre de la clienta");
      return;
    }
    if (!formData.serviceId) {
      Alert.alert("Error", "Selecciona un servicio");
      return;
    }
    if (!formData.employeeId) {
      Alert.alert(
        "Error",
        `Selecciona ${config.terminology.staffSingular.toLowerCase()}`,
      );
      return;
    }

    if (
      !esCeldaAgendaEnHorarioLaboral(
        selectedDate,
        selectedHour,
        businessHoursNorm,
        tenantTz,
      )
    ) {
      Alert.alert(
        "Fuera de horario",
        "Esa hora está fuera de la franja configurada. Elige otra celda o ajusta el horario en Configuración.",
      );
      return;
    }

    const appointmentDate = instanteCitaEnZona(
      selectedDate,
      selectedHour,
      tenantTz,
    );

    createMutation.mutate({
      client_name: formData.clientName.trim(),
      client_phone: formData.clientPhone.trim() || undefined,
      client_document: formData.clientDocument.trim() || undefined,
      service_id: formData.serviceId,
      employee_id: formData.employeeId,
      date: appointmentDate.toISOString(),
      duration: selectedService?.duration || 60,
      price: selectedService?.price || "0",
      status: "scheduled",
    });
  };

  const candidateStartDate = useMemo(() => {
    if (!modalVisible) return null;
    return instanteCitaEnZona(selectedDate, selectedHour, tenantTz);
  }, [modalVisible, selectedDate, selectedHour, tenantTz]);

  const availability = useAvailabilityCheck({
    employeeId: formData.employeeId,
    startDate: candidateStartDate,
    durationMinutes: selectedService?.duration || 60,
    enabled: modalVisible && !!formData.employeeId && !!formData.serviceId,
    staleTimeMs: 30_000,
  });

  const rescheduleStartDate = useMemo(() => {
    if (!detailModalVisible || !appointmentDetail || !rescheduleDate)
      return null;
    return instanteCitaEnZona(rescheduleDate, rescheduleHour, tenantTz);
  }, [
    appointmentDetail,
    detailModalVisible,
    rescheduleDate,
    rescheduleHour,
    tenantTz,
  ]);

  const rescheduleAvailability = useAvailabilityCheck({
    employeeId: appointmentDetail?.employee_id ?? "",
    startDate: rescheduleStartDate,
    durationMinutes: appointmentDetail?.duration ?? 60,
    excludeAppointmentId: appointmentDetail?.id ?? null,
    enabled: detailModalVisible && !!appointmentDetail && !!rescheduleDate,
    staleTimeMs: 30_000,
  });

  const formatDateLabel = useCallback(
    (date: Date) =>
      formatoFechaLargaEnZona(date, config.locale.language, tenantTz),
    [config.locale.language, tenantTz],
  );

  const empColWidth =
    (width - TIME_COL_W - Spacing.sm * 2) / Math.max(employees.length, 1);

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setAppointmentDetail(null);
  };

  const handleRescheduleDatePick = useCallback(
    (d: Date) => {
      setRescheduleDate(d);
      if (
        !esCeldaAgendaEnHorarioLaboral(
          d,
          rescheduleHour,
          businessHoursNorm,
          tenantTz,
        )
      ) {
        const first = agendaHours.find((h) =>
          esCeldaAgendaEnHorarioLaboral(d, h, businessHoursNorm, tenantTz),
        );
        if (first !== undefined) {
          setRescheduleHour(first);
        }
      }
    },
    [agendaHours, businessHoursNorm, rescheduleHour, tenantTz],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <AgendaHeader
        isTablet={isTablet}
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
          columnWidth={empColWidth}
          theme={theme}
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
        appointments={appointments}
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
        onOpenDetail={openAppointmentDetail}
      />

      <NewAppointmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        isTablet={isTablet}
        theme={theme}
        currencySymbol={currencySymbol}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
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
        weekDays={weekDays}
        rescheduleDate={rescheduleDate}
        rescheduleHour={rescheduleHour}
        onRescheduleDate={handleRescheduleDatePick}
        onRescheduleHour={setRescheduleHour}
        onReschedule={handleReschedule}
        onDelete={handleDeleteAppointment}
        updatePending={updateAppointmentMutation.isPending}
        deletePending={deleteAppointmentMutation.isPending}
        availabilityStatus={rescheduleAvailability.status}
        isBusy={rescheduleAvailability.isBusy}
        busyUntilLabel={rescheduleAvailability.busyUntilLabel}
      />
    </View>
  );
}
