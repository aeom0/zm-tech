import { Feather } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useHaptics } from "@/hooks/useHaptics";
import { useResponsive } from "@/hooks/useResponsive";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, queryClient } from "@/lib/query-client";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

interface DashboardStats {
  todayRevenue: number;
  completedAppointments: number;
  upcomingAppointments: number;
  lowStockItems: number;
}

interface Appointment {
  id: string;
  client_name: string;
  date: string;
  duration: number;
  price: string;
  status: string;
  employee_id: string;
  service_id: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const useStaggeredAnimation = (isLoading: boolean, count: number) => {
  const animations = Array.from({ length: count }, () => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(24),
    scale: useSharedValue(0.96),
  }));

  useEffect(() => {
    if (!isLoading) {
      animations.forEach((anim, index) => {
        const delay = index * 80;
        anim.opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }));
        anim.translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 200 }));
        anim.scale.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 200 }));
      });
    }
  }, [isLoading]);

  return animations.map((anim) =>
    useAnimatedStyle(() => ({
      opacity: anim.opacity.value,
      transform: [
        { translateY: anim.translateY.value },
        { scale: anim.scale.value },
      ],
    }))
  );
};

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

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", `?startDate=${startOfDay}&endDate=${endOfDay}`],
  });

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: services = [] } = useQuery<any[]>({ queryKey: ["/api/services"] });

  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, "Dashboard">>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status: string } }) => {
      const res = await apiRequest("PUT", `/api/appointments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (e: Error) => Alert.alert("Error", e.message || "No se pudo actualizar"),
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
    },
    onError: (e: Error) => Alert.alert("Error", e.message || "No se pudo registrar el pago"),
  });

  const handleMarkCompleted = (appointment: Appointment) => {
    const amount =
      typeof appointment.price === "number"
        ? appointment.price
        : parseFloat(appointment.price);
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
          refetchStats();
          refetchAppointments();
          haptics.success();
        },
      }
    );
  };

  const handleEditInAgenda = (appointment: Appointment) => {
    setModalVisible(false);
    setSelectedAppointment(null);
    navigation.navigate("Agenda", { appointmentId: appointment.id });
  };

  const isLoading = statsLoading || appointmentsLoading;

  const onRefresh = async () => {
    haptics.light();
    await Promise.all([refetchStats(), refetchAppointments()]);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const parseAppointmentDate = (dateString: string) => {
    if (!dateString) return new Date();
    const s = String(dateString).trim();
    const hasTimezone = s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s);
    return new Date(hasTimezone ? s : s.replace(" ", "T") + "Z");
  };

  const formatTime = (dateString: string) =>
    parseAppointmentDate(dateString).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e: any) => e.id === employeeId);
    return employee?.name || "Sin asignar";
  };

  const getEmployeeColor = (employeeId: string) => {
    const employee = employees.find((e: any) => e.id === employeeId);
    return employee?.color || Colors.light.violet;
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find((s: any) => s.id === serviceId);
    return service?.name || "Servicio";
  };

  const upcomingAppointments = appointments
    .filter((a) => a.status === "scheduled")
    .sort((a, b) =>
      parseAppointmentDate(a.date).getTime() - parseAppointmentDate(b.date).getTime()
    );

  const completedToday = appointments.filter((a) => a.status === "completed");

  const animatedItems = useStaggeredAnimation(isLoading, 6);

  // ─── Stat Card ────────────────────────────────────────────────────────────
  const StatCard = ({
    icon,
    label,
    value,
    color,
    subtitle,
    style,
  }: {
    icon: string;
    label: string;
    value: string | number;
    color: string;
    subtitle?: string;
    style?: any;
  }) => (
    <AnimatedView
      style={[
        styles.statCard,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        isTablet && styles.statCardTablet,
        style,
      ]}
    >
      <View style={[styles.statIconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={isTablet ? 22 : 18} color={color} />
      </View>
      <ThemedText style={[styles.statValue, { color, fontSize: isTablet ? 26 : 22 }]}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      {subtitle && (
        <ThemedText style={[styles.statSubtitle, { color: theme.textMuted }]}>
          {subtitle}
        </ThemedText>
      )}
    </AnimatedView>
  );

  // ─── Appointment Row ───────────────────────────────────────────────────────
  const AppointmentRow = ({ appointment, index }: { appointment: Appointment; index: number }) => {
    const empColor = getEmployeeColor(appointment.employee_id);
    const isLast = index === upcomingAppointments.slice(0, isTablet ? 8 : 5).length - 1;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.appointmentRow,
          { borderBottomColor: theme.border, borderBottomWidth: isLast ? 0 : 1 },
          pressed && { opacity: 0.75 },
        ]}
        onPress={() => {
          setSelectedAppointment(appointment);
          setModalVisible(true);
          haptics.light();
        }}
      >
        {/* Hora */}
        <View style={styles.rowTime}>
          <ThemedText style={[styles.rowTimeText, { color: theme.primary }]}>
            {formatTime(appointment.date)}
          </ThemedText>
        </View>

        {/* Dot de color de empleada */}
        <View style={[styles.rowDot, { backgroundColor: empColor }]} />

        {/* Info */}
        <View style={styles.rowInfo}>
          <ThemedText style={[styles.rowClient, { color: theme.text }]} numberOfLines={1}>
            {appointment.client_name}
          </ThemedText>
          <ThemedText style={[styles.rowService, { color: theme.textSecondary }]} numberOfLines={1}>
            {getServiceName(appointment.service_id)}
            {isTablet && ` · ${getEmployeeName(appointment.employee_id)}`}
          </ThemedText>
        </View>

        {/* Precio + duración */}
        <View style={styles.rowRight}>
          <ThemedText style={[styles.rowPrice, { color: theme.gold }]}>
            {currencySymbol}{parseFloat(appointment.price).toFixed(0)}
          </ThemedText>
          <ThemedText style={[styles.rowDuration, { color: theme.textMuted }]}>
            {appointment.duration}m
          </ThemedText>
        </View>

        <Feather name="chevron-right" size={14} color={theme.textMuted} style={{ marginLeft: 4 }} />
      </Pressable>
    );
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={Colors.light.violet} />
      </View>
    );
  }

  // ─── Layout: teléfono vs tablet ────────────────────────────────────────────
  const statsRow = (
    <View style={[styles.statsRow, isTablet && styles.statsRowTablet]}>
      <StatCard
        icon="dollar-sign"
        label="Ingresos hoy"
        value={`${currencySymbol}${stats?.todayRevenue?.toFixed(0) || "0"}`}
        color={theme.gold}
        subtitle={completedToday.length > 0 ? `${completedToday.length} pagos` : undefined}
        style={animatedItems[1]}
      />
      <StatCard
        icon="check-circle"
        label="Completadas"
        value={stats?.completedAppointments || 0}
        color={theme.success}
        style={animatedItems[2]}
      />
      <StatCard
        icon="clock"
        label="Pendientes"
        value={upcomingAppointments.length}
        color={theme.primary}
        style={animatedItems[3]}
      />
    </View>
  );

  const appointmentsCard = (
    <AnimatedView
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        animatedItems[0],
      ]}
    >
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.cardTitle}>Próximas citas</ThemedText>
          <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            {formatDate()}
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
          <Image
            source={require("../assets/images/empty-appointments.png")}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            Todo despejado por hoy
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            No hay citas programadas
          </ThemedText>
        </View>
      ) : (
        upcomingAppointments
          .slice(0, isTablet ? 8 : 5)
          .map((appt, i) => <AppointmentRow key={appt.id} appointment={appt} index={i} />)
      )}

      {upcomingAppointments.length > (isTablet ? 8 : 5) && (
        <Pressable
          style={[styles.viewMoreBtn, { borderTopColor: theme.border }]}
          onPress={() => navigation.navigate("Agenda", {})}
        >
          <ThemedText style={[styles.viewMoreText, { color: theme.primary }]}>
            Ver todas en Agenda
          </ThemedText>
          <Feather name="arrow-right" size={14} color={theme.primary} />
        </Pressable>
      )}
    </AnimatedView>
  );

  const lowStockBanner = stats && stats.lowStockItems > 0 ? (
    <AnimatedView
      style={[
        styles.alertBanner,
        {
          backgroundColor: isDark ? "#3A2800" : "#FFF8E7",
          borderColor: theme.gold,
        },
        animatedItems[4],
      ]}
    >
      <View style={[styles.alertIcon, { backgroundColor: `${theme.gold}20` }]}>
        <Feather name="alert-triangle" size={16} color={theme.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.alertTitle, { color: theme.gold }]}>
          Stock bajo
        </ThemedText>
        <ThemedText style={[styles.alertBody, { color: theme.textSecondary }]}>
          {stats.lowStockItems} producto{stats.lowStockItems > 1 ? "s" : ""} necesitan reposición
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={16} color={theme.gold} />
    </AnimatedView>
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
      {/* ── Header ── */}
      <AnimatedView style={[styles.header, animatedItems[5]]}>
        <View>
          <ThemedText style={[styles.greeting, { color: theme.textSecondary }]}>
            {getGreeting()}{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </ThemedText>
          <ThemedText style={[styles.dateText, { color: theme.text }]} numberOfLines={1}>
            {formatDate()}
          </ThemedText>
        </View>
        <View style={[styles.logoMark, { backgroundColor: `${config.theme.primaryColor}12` }]}>
          <ThemedText style={[styles.logoLetter, { color: config.theme.primaryColor }]}>
            {config.businessName.slice(0, 2).toUpperCase()}
          </ThemedText>
        </View>
      </AnimatedView>

      {/* ── Layout tablet: 2 columnas / teléfono: apilado ── */}
      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.tabletLeft}>
            {appointmentsCard}
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
          {appointmentsCard}
          {lowStockBanner && (
            <View style={{ height: Spacing.lg }} />
          )}
          {lowStockBanner}
        </>
      )}

      {/* ── Modal detalle cita ── */}
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
              isTablet && styles.modalContentTablet,
            ]}
          >
            {selectedAppointment && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Detalle de cita</ThemedText>
                  <Pressable
                    onPress={() => { setModalVisible(false); setSelectedAppointment(null); }}
                    style={[styles.modalCloseBtn, { backgroundColor: theme.backgroundSecondary }]}
                    hitSlop={8}
                  >
                    <Feather name="x" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>

                <View style={[styles.modalBody, { borderColor: theme.border }]}>
                  <ThemedText style={[styles.modalClient, { color: theme.text }]}>
                    {selectedAppointment.client_name}
                  </ThemedText>
                  <ThemedText style={[styles.modalService, { color: theme.textSecondary }]}>
                    {getServiceName(selectedAppointment.service_id)}
                  </ThemedText>
                  <View style={styles.modalMeta}>
                    <View style={[styles.modalMetaChip, { backgroundColor: `${theme.primary}12` }]}>
                      <Feather name="clock" size={12} color={theme.primary} />
                      <ThemedText style={[styles.modalMetaText, { color: theme.primary }]}>
                        {formatTime(selectedAppointment.date)}
                      </ThemedText>
                    </View>
                    <View style={[styles.modalMetaChip, { backgroundColor: `${theme.primary}12` }]}>
                      <Feather name="activity" size={12} color={theme.primary} />
                      <ThemedText style={[styles.modalMetaText, { color: theme.primary }]}>
                        {selectedAppointment.duration} min
                      </ThemedText>
                    </View>
                    <View style={[styles.modalMetaChip, { backgroundColor: `${theme.gold}18` }]}>
                      <ThemedText style={[styles.modalMetaText, { color: theme.gold, fontWeight: "700" }]}>
                        {currencySymbol}{parseFloat(String(selectedAppointment.price)).toFixed(0)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={[styles.modalBtn, { backgroundColor: theme.success }]}
                  onPress={() => handleMarkCompleted(selectedAppointment)}
                  disabled={updateAppointmentMutation.isPending}
                >
                  {updateAppointmentMutation.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={16} color="#FFF" />
                      <ThemedText style={styles.modalBtnText}>Marcar completada</ThemedText>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.modalBtnOutline, { borderColor: theme.primary }]}
                  onPress={() => handleEditInAgenda(selectedAppointment)}
                >
                  <Feather name="edit-2" size={16} color={theme.primary} />
                  <ThemedText style={[styles.modalBtnOutlineText, { color: theme.primary }]}>
                    Editar en Agenda
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 3,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statsRowTablet: {
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: "center",
    ...Shadows.sm,
  },
  statCardTablet: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },

  // Card
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    textTransform: "capitalize",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Appointment row
  appointmentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowTime: {
    width: 56,
    marginRight: Spacing.sm,
  },
  rowTimeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  rowInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  rowClient: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowService: {
    fontSize: 12,
    marginTop: 1,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  rowPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowDuration: {
    fontSize: 11,
    marginTop: 1,
  },

  // View more
  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
  },
  emptyImage: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
  },

  // Alert banner
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  alertBody: {
    fontSize: 12,
    marginTop: 1,
  },

  // Tablet layout
  tabletLayout: {
    flexDirection: "row",
    gap: Spacing["2xl"],
    alignItems: "flex-start",
  },
  tabletLeft: {
    flex: 3,
  },
  tabletRight: {
    flex: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalOverlayTablet: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    paddingTop: Spacing.md,
  },
  modalContentTablet: {
    borderRadius: BorderRadius.xl,
    width: 460,
    paddingBottom: Spacing.xl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C0C0C0",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
  },
  modalClient: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalService: {
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  modalMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  modalMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  modalMetaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  modalBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  modalBtnOutlineText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
