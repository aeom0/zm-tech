import React, { useState, useMemo, useEffect, useCallback } from "react";
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

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [appointmentDetail, setAppointmentDetail] =
    useState<AgendaAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleHour, setRescheduleHour] = useState<number>(10);
  const [selectedHour, setSelectedHour] = useState(9);
  const [statusFilter, setStatusFilter] =
    useState<AgendaStatusFilterType>("all");
  const [formData, setFormData] = useState<AgendaFormState>(emptyAgendaForm);

  const { weekDays } = useAgendaCalendar(selectedDate);

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
        const aptDate = new Date(apt.date);
        setRescheduleDate(aptDate);
        setRescheduleHour(aptDate.getHours());
        setDetailModalVisible(true);
      }
      (
        navigation as unknown as {
          setParams: (p: { appointmentId?: string }) => void;
        }
      ).setParams({ appointmentId: undefined });
    }
  }, [appointmentIdParam, appointments, navigation]);

  const changeWeek = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta * 7);
    setSelectedDate(newDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const changeDay = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
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
    const aptDate = new Date(apt.date);
    setRescheduleDate(aptDate);
    setRescheduleHour(aptDate.getHours());
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
    const newDate = new Date(rescheduleDate);
    newDate.setHours(rescheduleHour, 0, 0, 0);
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

    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(selectedHour, 0, 0, 0);

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
    const d = new Date(selectedDate);
    d.setHours(selectedHour, 0, 0, 0);
    return d;
  }, [modalVisible, selectedDate, selectedHour]);

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
    const d = new Date(rescheduleDate);
    d.setHours(rescheduleHour, 0, 0, 0);
    return d;
  }, [appointmentDetail, detailModalVisible, rescheduleDate, rescheduleHour]);

  const rescheduleAvailability = useAvailabilityCheck({
    employeeId: appointmentDetail?.employee_id ?? "",
    startDate: rescheduleStartDate,
    durationMinutes: appointmentDetail?.duration ?? 60,
    excludeAppointmentId: appointmentDetail?.id ?? null,
    enabled: detailModalVisible && !!appointmentDetail && !!rescheduleDate,
    staleTimeMs: 30_000,
  });

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString(config.locale.language, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const empColWidth =
    (width - TIME_COL_W - Spacing.sm * 2) / Math.max(employees.length, 1);

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setAppointmentDetail(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <AgendaHeader
        isTablet={isTablet}
        theme={theme}
        language={config.locale.language}
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
        appointments={appointments}
        employees={employees}
        services={services}
        statusFilter={statusFilter}
        isLoading={isLoading}
        onRefresh={refetch}
        theme={theme}
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
        weekDays={weekDays}
        rescheduleDate={rescheduleDate}
        rescheduleHour={rescheduleHour}
        onRescheduleDate={setRescheduleDate}
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
