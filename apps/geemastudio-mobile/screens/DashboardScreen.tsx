import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHaptics } from "@/hooks/useHaptics";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/hooks/useTheme";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

import { DashboardAppointmentModal } from "./dashboard/components/DashboardAppointmentModal";
import { DashboardHeader } from "./dashboard/components/DashboardHeader";
import { DashboardLoading } from "./dashboard/components/DashboardLoading";
import { DashboardLowStockBanner } from "./dashboard/components/DashboardLowStockBanner";
import { DashboardStatCard } from "./dashboard/components/DashboardStatCard";
import { DashboardUpcomingCard } from "./dashboard/components/DashboardUpcomingCard";
import { dashboardStyles as styles } from "./dashboard/dashboardStyles";
import {
  formatDashboardDateLong,
  getGreeting,
  parseAppointmentDate,
} from "./dashboard/dashboardUtils";
import { useDashboardMutations } from "./dashboard/hooks/useDashboardMutations";
import { useDashboardQueries } from "./dashboard/hooks/useDashboardQueries";
import { useStaggeredAnimation } from "./dashboard/hooks/useStaggeredAnimation";
import type { DashboardAppointment } from "./dashboard/types";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { isTablet } = useResponsive();
  const haptics = useHaptics();
  const { profile } = useAuth();
  const { config } = useTenant();
  const currencySymbol = config.locale.currency.symbol;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  const startOfDay = dayStart.toISOString();
  const endOfDay = dayEnd.toISOString();

  const {
    stats,
    statsLoading,
    refetchStats,
    appointments,
    appointmentsLoading,
    refetchAppointments,
    employees,
    services,
  } = useDashboardQueries(startOfDay, endOfDay);

  const { updateAppointmentMutation, createPaymentMutation } =
    useDashboardMutations();

  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList, "Dashboard">>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<DashboardAppointment | null>(null);

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.name ?? "Servicio";
  };

  const handleMarkCompleted = (appointment: DashboardAppointment) => {
    const amount =
      typeof appointment.price === "number"
        ? appointment.price
        : parseFloat(String(appointment.price));
    updateAppointmentMutation.mutate(
      { id: appointment.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          createPaymentMutation.mutate({
            appointment_id: appointment.id,
            amount: String(amount),
            method: "cash",
            date: new Date().toISOString(),
            notes: `Cita completada: ${getServiceName(appointment.service_id)}`,
          });
          setModalVisible(false);
          setSelectedAppointment(null);
          void refetchStats();
          void refetchAppointments();
          haptics.success();
        },
      },
    );
  };

  const handleEditInAgenda = (appointment: DashboardAppointment) => {
    setModalVisible(false);
    setSelectedAppointment(null);
    navigation.navigate("Agenda", { appointmentId: appointment.id });
  };

  const isLoading = statsLoading || appointmentsLoading;

  const onRefresh = async () => {
    haptics.light();
    await Promise.all([refetchStats(), refetchAppointments()]);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name ?? "Sin asignar";
  };

  const getEmployeeColor = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.color ?? Colors.light.violet;
  };

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.status === "scheduled")
      .sort(
        (a, b) =>
          parseAppointmentDate(a.date).getTime() -
          parseAppointmentDate(b.date).getTime(),
      );
  }, [appointments]);

  const completedToday = useMemo(
    () => appointments.filter((a) => a.status === "completed"),
    [appointments],
  );

  const animatedItems = useStaggeredAnimation(isLoading);

  const visibleLimit = isTablet ? 8 : 5;

  const greeting = getGreeting();
  const displayNameSuffix = profile?.full_name
    ? `, ${profile.full_name.split(" ")[0]}`
    : "";
  const dateLabel = formatDashboardDateLong(config.locale.language);

  if (isLoading) {
    return <DashboardLoading backgroundColor={theme.backgroundRoot} />;
  }

  const statsRow = (
    <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
      <DashboardStatCard
        icon="dollar-sign"
        label="Ingresos hoy"
        value={`${currencySymbol}${stats?.todayRevenue?.toFixed(0) ?? "0"}`}
        color={theme.gold}
        subtitle={
          completedToday.length > 0
            ? `${completedToday.length} pagos`
            : undefined
        }
        style={animatedItems[1]}
        isTablet={isTablet}
        theme={{
          backgroundDefault: theme.backgroundDefault,
          border: theme.border,
          textSecondary: theme.textSecondary,
          textMuted: theme.textMuted,
        }}
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
      />
      <DashboardStatCard
        icon="clock"
        label="Pendientes"
        value={upcomingAppointments.length}
        color={theme.primary}
        style={animatedItems[3]}
        isTablet={isTablet}
        theme={{
          backgroundDefault: theme.backgroundDefault,
          border: theme.border,
          textSecondary: theme.textSecondary,
          textMuted: theme.textMuted,
        }}
      />
    </View>
  );

  const lowStockBanner =
    stats && stats.lowStockItems > 0 ? (
      <DashboardLowStockBanner
        count={stats.lowStockItems}
        isDark={isDark}
        theme={{ gold: theme.gold, textSecondary: theme.textSecondary }}
        animatedStyle={animatedItems[4]}
      />
    ) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: isTablet ? Spacing["2xl"] : Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={onRefresh}
          tintColor={Colors.light.violet}
        />
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
              locale={config.locale.language}
              currencySymbol={currencySymbol}
              isTablet={isTablet}
              theme={{
                backgroundDefault: theme.backgroundDefault,
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
              onOpenAppointment={(appt) => {
                setSelectedAppointment(appt);
                setModalVisible(true);
                haptics.light();
              }}
              onViewAllAgenda={() => navigation.navigate("Agenda", {})}
            />
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
            locale={config.locale.language}
            currencySymbol={currencySymbol}
            isTablet={isTablet}
            theme={{
              backgroundDefault: theme.backgroundDefault,
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
            onOpenAppointment={(appt) => {
              setSelectedAppointment(appt);
              setModalVisible(true);
              haptics.light();
            }}
            onViewAllAgenda={() => navigation.navigate("Agenda", {})}
          />
          {lowStockBanner ? <View style={{ height: Spacing.lg }} /> : null}
          {lowStockBanner}
        </>
      )}

      <DashboardAppointmentModal
        visible={modalVisible}
        appointment={selectedAppointment}
        isTablet={isTablet}
        currencySymbol={currencySymbol}
        locale={config.locale.language}
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
        isCompleting={updateAppointmentMutation.isPending}
        onClose={() => {
          setModalVisible(false);
          setSelectedAppointment(null);
        }}
        onMarkCompleted={handleMarkCompleted}
        onEditInAgenda={handleEditInAgenda}
      />
    </ScrollView>
  );
}
