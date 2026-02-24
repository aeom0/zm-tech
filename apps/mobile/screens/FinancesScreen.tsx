import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Line } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useTenant } from "@/contexts/TenantContext";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import type { CompositeNavigationProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import type { MoreStackParamList } from "@/navigation/MoreStackNavigator";

interface Payment {
  id: string;
  appointment_id: string | null;
  amount: string;
  method: string;
  date: string;
  notes: string | null;
  is_abono?: boolean;
  service_total?: string | null;
}

type Period = "today" | "week" | "month";

interface AppointmentOption {
  id: string;
  client_name: string;
  date: string;
  status: string;
  price: string;
  service_id: string | null;
  employee_id: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  name: string;
}

const PAYMENT_METHODS = [
  { id: "cash", label: "Efectivo", icon: "dollar-sign" as const },
  { id: "card", label: "Tarjeta", icon: "credit-card" as const },
  { id: "yape", label: "Yape", icon: "smartphone" as const },
  { id: "plin", label: "Plin", icon: "smartphone" as const },
  { id: "transfer", label: "Transferencia", icon: "smartphone" as const },
];

// Tipo de pago: pago libre, adelanto WhatsApp (20%), o completar el 80% restante
type PaymentType = "full" | "abono" | "completar";

const ABONO_PERCENT = 0.2;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.xl * 2;
const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 8, right: 24, bottom: 28, left: 8 };
const CHART_INNER_WIDTH =
  CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const CHART_INNER_HEIGHT =
  CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

function formatCurrency(value: number): string {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function FinancesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();
  const currencySymbol = config.locale.currency.symbol;
  const { isAdmin } = useAuth();
  const { isTablet } = useResponsive();
  // Puede estar en tab Finanzas (legacy) o dentro del stack Más
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        NativeStackNavigationProp<MoreStackParamList, "Finanzas">,
        BottomTabNavigationProp<MainTabParamList, "More">
      >
    >();

  const [period, setPeriod] = useState<Period>("week");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>("full");
  const [formData, setFormData] = useState({
    amount: "",
    serviceTotal: "",
    method: "cash",
    notes: "",
  });
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);

  // Derived helpers for backward compat
  const isAbono = paymentType === "abono";

  const dateRanges = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);

    return {
      today: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
      week: { start: weekStart.toISOString(), end: new Date().toISOString() },
      month: { start: monthStart.toISOString(), end: new Date().toISOString() },
    };
  }, []);

  const currentRange = dateRanges[period];

  const {
    data: payments = [],
    isLoading,
    refetch,
  } = useQuery<Payment[]>({
    queryKey: [
      "/api/payments",
      `?startDate=${currentRange.start}&endDate=${currentRange.end}`,
    ],
  });

  // Citas recientes/próximas para enlazar pagos y mostrar cliente/servicio en cada pago.
  const { userId } = useAuth();
  const { data: recentAppointments = [] } = useQuery<AppointmentOption[]>({
    queryKey: ["/finances/recent-appointments", isAdmin ? "admin" : userId],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, client_name, date, status, price, service_id, employee_id")
        .order("date", { ascending: false })
        .limit(100);

      // Staff solo ve sus propias citas
      if (!isAdmin && userId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("employee_id")
          .eq("id", userId)
          .maybeSingle();
        if (prof?.employee_id) {
          q = q.eq("employee_id", prof.employee_id);
        }
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as AppointmentOption[];
    },
  });

  // Servicios (id, name) para mostrar nombre en pagos vinculados a cita.
  const { data: servicesList = [] } = useQuery<ServiceOption[]>({
    queryKey: ["/finances/services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name");
      if (error) throw new Error(error.message);
      return (data ?? []) as ServiceOption[];
    },
  });

  // Empleadas para desglose por chica (solo admin).
  const { data: employeesList = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["/api/employees"],
    enabled: isAdmin,
  });

  const serviceNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of servicesList) {
      map[s.id] = s.name;
    }
    return map;
  }, [servicesList]);

  // Abono previo por cita: { appointment_id → { amount, service_total } }
  const abonoPrevioByApt = useMemo(() => {
    const map: Record<string, { amount: number; service_total: number }> = {};
    for (const p of payments) {
      if (p.is_abono && p.appointment_id && p.service_total) {
        const st = parseFloat(String(p.service_total));
        const amt = parseFloat(String(p.amount));
        if (!Number.isNaN(st) && !Number.isNaN(amt)) {
          map[p.appointment_id] = { amount: amt, service_total: st };
        }
      }
    }
    return map;
  }, [payments]);

  // Por cada cita con pagos: total a pagar (precio cita o service_total del abono) y lo ya pagado → pendiente.
  const pendienteByAppointmentId = useMemo(() => {
    const paidByApt: Record<string, number> = {};
    const totalByApt: Record<string, number> = {};
    for (const p of payments) {
      const aid = p.appointment_id;
      if (!aid) continue;
      const amount = parseFloat(String(p.amount));
      paidByApt[aid] = (paidByApt[aid] ?? 0) + amount;
      const serviceTotal =
        p.service_total != null ? parseFloat(String(p.service_total)) : null;
      if (
        serviceTotal != null &&
        (totalByApt[aid] == null || serviceTotal > (totalByApt[aid] ?? 0))
      ) {
        totalByApt[aid] = serviceTotal;
      }
    }
    for (const apt of recentAppointments) {
      if (totalByApt[apt.id] == null) {
        totalByApt[apt.id] = parseFloat(String(apt.price));
      }
    }
    const pendiente: Record<string, number> = {};
    for (const aid of Object.keys(paidByApt)) {
      const total = totalByApt[aid] ?? 0;
      const paid = paidByApt[aid] ?? 0;
      const rest = total - paid;
      if (rest > 0.01) pendiente[aid] = rest;
    }
    return pendiente;
  }, [payments, recentAppointments]);

  // Citas en el período actual (para desglose por chica en admin).
  const { data: appointmentsInPeriod = [] } = useQuery<
    { id: string; employee_id: string | null; price: string }[]
  >({
    queryKey: [
      "/finances/appointments-in-period",
      currentRange.start,
      currentRange.end,
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, employee_id, price")
        .gte("date", currentRange.start)
        .lte("date", currentRange.end);
      if (error) throw new Error(error.message);
      return (data ?? []) as {
        id: string;
        employee_id: string | null;
        price: string;
      }[];
    },
    enabled: isAdmin,
  });

  // Desglose por chica: generado (precio citas), pagado (suma pagos de sus citas), pendiente.
  const desglosePorChica = useMemo(() => {
    if (!isAdmin || employeesList.length === 0) return [];
    const paidByApt: Record<string, number> = {};
    for (const p of payments) {
      const aid = p.appointment_id;
      if (!aid) continue;
      paidByApt[aid] = (paidByApt[aid] ?? 0) + parseFloat(String(p.amount));
    }
    const aptById: Record<
      string,
      { employee_id: string | null; price: number }
    > = {};
    for (const a of appointmentsInPeriod) {
      aptById[a.id] = {
        employee_id: a.employee_id,
        price: parseFloat(String(a.price)),
      };
    }
    const byEmployee: Record<
      string,
      { generado: number; pagado: number; pendiente: number }
    > = {};
    for (const emp of employeesList) {
      byEmployee[emp.id] = { generado: 0, pagado: 0, pendiente: 0 };
    }
    for (const a of appointmentsInPeriod) {
      const eid = a.employee_id;
      if (!eid || !byEmployee[eid]) continue;
      const price = parseFloat(String(a.price));
      const paid = paidByApt[a.id] ?? 0;
      byEmployee[eid].generado += price;
      byEmployee[eid].pagado += paid;
      byEmployee[eid].pendiente += Math.max(0, price - paid);
    }
    return employeesList
      .filter((e) => {
        const r = byEmployee[e.id];
        return r && (r.generado > 0 || r.pagado > 0);
      })
      .map((e) => ({
        id: e.id,
        name: e.name,
        ...byEmployee[e.id],
      }));
  }, [isAdmin, employeesList, payments, appointmentsInPeriod]);

  const { data: revenueData = [] } = useQuery<
    { date: string; total: number }[]
  >({
    queryKey: ["/api/dashboard/revenue"],
  });

  const totalRevenue = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0),
    [payments],
  );

  const totalAbono = useMemo(
    () =>
      payments
        .filter((p) => p.is_abono)
        .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0),
    [payments],
  );

  const chartDataByPeriod = useMemo(() => {
    const days = period === "today" ? 7 : period === "week" ? 7 : 30;
    return revenueData.slice(-days);
  }, [revenueData, period]);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo registrar el pago"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => {
      const res = await apiRequest("PUT", `/api/payments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo actualizar el pago"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
      closeModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) =>
      Alert.alert("Error", e.message || "No se pudo eliminar el pago"),
  });

  const openNewPayment = (prefillAptId?: string, prefillType?: PaymentType) => {
    setEditingPayment(null);
    setPaymentType(prefillType ?? "full");
    const apt = prefillAptId
      ? recentAppointments.find((a) => a.id === prefillAptId)
      : undefined;
    const abono = prefillAptId ? abonoPrevioByApt[prefillAptId] : undefined;
    const initAmount =
      prefillType === "completar" && abono
        ? String((abono.service_total - abono.amount).toFixed(2))
        : apt && !abono
          ? String(parseFloat(String(apt.price)).toFixed(2))
          : "";
    setFormData({
      amount: initAmount,
      serviceTotal: "",
      method: "cash",
      notes: "",
    });
    setSelectedAppointmentId(prefillAptId ?? null);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentType(payment.is_abono ? "abono" : "full");
    setFormData({
      amount:
        typeof payment.amount === "number"
          ? String(payment.amount)
          : (payment.amount ?? ""),
      serviceTotal:
        payment.service_total != null ? String(payment.service_total) : "",
      method: typeof payment.method === "string" ? payment.method : "cash",
      notes: payment.notes != null ? String(payment.notes) : "",
    });
    setSelectedAppointmentId(payment.appointment_id ?? null);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingPayment(null);
  };

  const abonoAmount = useMemo(() => {
    if (paymentType !== "abono" || !formData.serviceTotal.trim()) return null;
    const total = parseFloat(formData.serviceTotal.replace(",", "."));
    if (Number.isNaN(total) || total <= 0) return null;
    return (total * ABONO_PERCENT).toFixed(2);
  }, [paymentType, formData.serviceTotal]);

  // Al seleccionar una cita en el formulario, auto-rellenar monto y detectar abono previo
  const onSelectAppointment = (aptId: string | null) => {
    setSelectedAppointmentId(aptId);
    if (!aptId) return;
    const apt = recentAppointments.find((a) => a.id === aptId);
    const abono = abonoPrevioByApt[aptId];
    if (paymentType === "completar" && abono) {
      const restante = (abono.service_total - abono.amount).toFixed(2);
      setFormData((p) => ({ ...p, amount: restante }));
    } else if (paymentType === "full" && apt && !abono) {
      setFormData((p) => ({
        ...p,
        amount: parseFloat(String(apt.price)).toFixed(2),
      }));
    }
  };

  const handleSubmit = () => {
    const amountRaw =
      paymentType === "abono" && abonoAmount ? abonoAmount : formData.amount;
    const amount =
      typeof amountRaw === "string"
        ? amountRaw.replace(",", ".")
        : String(amountRaw ?? "");
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) {
      Alert.alert("Error", "Ingresa un monto válido");
      return;
    }

    const payload = {
      amount: String(num),
      method: formData.method,
      date: editingPayment ? editingPayment.date : new Date().toISOString(),
      notes: formData.notes.trim() || null,
      is_abono: paymentType === "abono",
      service_total:
        paymentType === "abono" && formData.serviceTotal.trim()
          ? parseFloat(formData.serviceTotal.replace(",", "."))
          : null,
      appointment_id: selectedAppointmentId,
    };

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (payment: Payment) => {
    Alert.alert(
      "Eliminar pago",
      `¿Eliminar pago de ${currencySymbol}${parseFloat(payment.amount).toFixed(2)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteMutation.mutate(payment.id),
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMethod = (method: string) => {
    return PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method;
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const SimpleChart = () => {
    const data = chartDataByPeriod;
    if (data.length === 0) {
      return (
        <View style={[styles.noChartData, { height: CHART_HEIGHT }]}>
          <Feather name="bar-chart-2" size={40} color={theme.textMuted} />
          <ThemedText
            style={[
              styles.noChartText,
              { color: theme.textMuted, marginTop: Spacing.sm },
            ]}
          >
            Sin datos en este período
          </ThemedText>
        </View>
      );
    }

    const maxValue = Math.max(...data.map((d) => d.total), 1);
    const padding = CHART_PADDING;
    const innerW = CHART_INNER_WIDTH;
    const innerH = CHART_INNER_HEIGHT;
    const n = data.length;
    const step = n > 1 ? n - 1 : 1;
    const points = data.map((d, i) => ({
      x: padding.left + (i / step) * innerW,
      y: padding.top + innerH - (d.total / maxValue) * innerH,
      label: (() => {
        const dt = new Date(d.date);
        return period === "month"
          ? `${dt.getDate()}/${dt.getMonth() + 1}`
          : DAYS_SHORT[dt.getDay()];
      })(),
    }));

    const pathData =
      points.length === 1
        ? `M ${points[0].x} ${padding.top + innerH} L ${points[0].x} ${points[0].y}`
        : points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

    return (
      <View style={styles.chartWrapper}>
        {maxValue > 0 && (
          <View style={styles.chartYLabel}>
            <ThemedText
              style={[styles.chartYLabelText, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {currencySymbol}{formatCurrency(maxValue)}
            </ThemedText>
          </View>
        )}
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={styles.chartSvg}>
          {[0, 0.5, 1].map((ratio, i) => (
            <Line
              key={i}
              x1={padding.left}
              y1={padding.top + (1 - ratio) * innerH}
              x2={padding.left + innerW}
              y2={padding.top + (1 - ratio) * innerH}
              stroke={theme.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}
          <Path
            d={pathData}
            stroke={Colors.light.gold}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={points.length === 1 ? 6 : 4}
              fill={Colors.light.gold}
            />
          ))}
        </Svg>
        <View style={styles.chartXLabels}>
          {points.map((p, i) => (
            <View
              key={i}
              style={[
                styles.chartXLabelItem,
                { width: n > 1 ? innerW / n : innerW },
              ]}
            >
              <ThemedText
                style={[styles.chartXLabelText, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {p.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const PeriodButton = ({ value, label }: { value: Period; label: string }) => (
    <Pressable
      style={[
        styles.periodButton,
        {
          backgroundColor:
            period === value ? theme.primary : theme.backgroundSecondary,
        },
      ]}
      onPress={() => {
        setPeriod(value);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <ThemedText
        style={[
          styles.periodText,
          { color: period === value ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  // Staff ve "Mis ganancias" (solo lectura); admin ve finanzas completas con desglose por chica.
  const isStaffOnly = !isAdmin;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl + 80,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.light.violet}
          />
        }
      >
        <View style={styles.periodSelector}>
          <PeriodButton value="today" label="Hoy" />
          <PeriodButton value="week" label="Semana" />
          <PeriodButton value="month" label="Mes" />
        </View>

        <View style={isTablet ? styles.kpiRowTablet : undefined}>
          <View
            style={[
              styles.revenueCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                flex: isTablet ? 1 : undefined,
              },
            ]}
          >
            <View style={styles.revenueCardHeader}>
              <Feather name="trending-up" size={20} color={Colors.light.gold} />
              <ThemedText
                style={[styles.revenueLabel, { color: theme.textSecondary }]}
              >
                {isStaffOnly ? "Mis ganancias" : "Ingresos Totales"}
              </ThemedText>
            </View>
            <View style={styles.revenueRow}>
              <ThemedText
                style={[styles.revenueAmount, { color: Colors.light.gold }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {currencySymbol} {formatCurrency(totalRevenue)}
              </ThemedText>
            </View>
            <View style={styles.revenueMeta}>
              <ThemedText
                style={[styles.periodLabel, { color: theme.textMuted }]}
              >
                {period === "today"
                  ? "Hoy"
                  : period === "week"
                    ? "Últimos 7 días"
                    : "Últimos 30 días"}
              </ThemedText>
              <ThemedText
                style={[styles.transactionCount, { color: theme.textMuted }]}
              >
                {payments.length}{" "}
                {payments.length === 1 ? "transacción" : "transacciones"}
              </ThemedText>
              {totalAbono > 0 && (
                <View style={styles.abonoIndicator}>
                  <Feather name="smartphone" size={12} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.abonoIndicatorText,
                      { color: theme.primary },
                    ]}
                  >
                    Adelantos 20%: {currencySymbol} {formatCurrency(totalAbono)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                flex: isTablet ? 1 : undefined,
              },
            ]}
          >
            <View style={styles.chartCardHeader}>
              <ThemedText style={styles.chartTitle}>
                Tendencia de Ingresos
              </ThemedText>
              {chartDataByPeriod.length > 0 && (
                <ThemedText
                  style={[styles.chartSubtitle, { color: theme.textMuted }]}
                >
                  Total: {currencySymbol}
                  {formatCurrency(
                    chartDataByPeriod.reduce((s, d) => s + d.total, 0),
                  )}
                </ThemedText>
              )}
            </View>
            <SimpleChart />
          </View>
        </View>
        {/* cierra kpiRowTablet */}

        {isAdmin && desglosePorChica.length > 0 && (
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.chartCardHeader}>
              <ThemedText style={styles.chartTitle}>
                Por chica (período)
              </ThemedText>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {desglosePorChica.map((row) => (
                <View
                  key={row.id}
                  style={[
                    styles.desgloseRow,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.desgloseName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </ThemedText>
                  <View style={styles.desgloseAmounts}>
                    <ThemedText
                      style={[styles.desgloseLabel, { color: theme.textMuted }]}
                    >
                      Generado {currencySymbol} {formatCurrency(row.generado)}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.desgloseLabel,
                        { color: Colors.light.gold },
                      ]}
                    >
                      Pagado {currencySymbol} {formatCurrency(row.pagado)}
                    </ThemedText>
                    {row.pendiente > 0.01 && (
                      <ThemedText
                        style={[
                          styles.desgloseLabel,
                          { color: theme.primary, fontWeight: "600" },
                        ]}
                      >
                        Pendiente {currencySymbol} {formatCurrency(row.pendiente)}
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>
            {isStaffOnly ? "Mis pagos" : "Historial de Pagos"}
          </ThemedText>
          <ThemedText style={[styles.paymentCount, { color: theme.primary }]}>
            {payments.length}
          </ThemedText>
        </View>

        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Image
              source={require("../assets/images/empty-finances.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <ThemedText
              style={[styles.emptyTitle, { color: theme.textSecondary }]}
            >
              Sin pagos registrados
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textMuted }]}
            >
              {isStaffOnly
                ? "No hay pagos de tus citas en este período"
                : "Registra un pago o un abono (20%)"}
            </ThemedText>
          </View>
        ) : (
          <View style={isTablet ? styles.paymentsGridTablet : undefined}>
            {payments.map((payment) => {
              const linkedAppointment =
                payment.appointment_id != null
                  ? recentAppointments.find(
                      (apt) => apt.id === payment.appointment_id,
                    )
                  : undefined;
              const serviceName =
                linkedAppointment?.service_id != null
                  ? (serviceNameById[linkedAppointment.service_id] ?? null)
                  : null;
              const pendiente =
                payment.appointment_id != null
                  ? pendienteByAppointmentId[payment.appointment_id]
                  : undefined;

              return (
                <Pressable
                  key={payment.id}
                  style={({ pressed }) => [
                    styles.paymentCard,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                      opacity: pressed ? 0.9 : 1,
                      ...(isTablet && { width: "48.5%" }),
                    },
                  ]}
                  onPress={() => isAdmin && openEditPayment(payment)}
                  onLongPress={() => isAdmin && handleDelete(payment)}
                >
                  <View style={styles.paymentInfo}>
                    <View style={styles.paymentHeader}>
                      <View
                        style={[
                          styles.methodBadge,
                          { backgroundColor: theme.primary + "15" },
                        ]}
                      >
                        <Feather
                          name={
                            PAYMENT_METHODS.find((m) => m.id === payment.method)
                              ?.icon ?? "dollar-sign"
                          }
                          size={14}
                          color={theme.primary}
                        />
                      </View>
                      <ThemedText style={styles.paymentMethod}>
                        {formatMethod(payment.method)}
                      </ThemedText>
                      {payment.is_abono && (
                        <View
                          style={[
                            styles.abonoBadge,
                            { backgroundColor: Colors.light.gold + "20" },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.abonoBadgeText,
                              { color: Colors.light.gold },
                            ]}
                          >
                            Abono 20%
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText
                      style={[styles.paymentDate, { color: theme.textMuted }]}
                    >
                      {formatDate(payment.date)}
                    </ThemedText>
                    {linkedAppointment && (
                      <ThemedText
                        style={[
                          styles.paymentLinkedAppointment,
                          { color: theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {linkedAppointment.client_name}
                        {serviceName ? ` · ${serviceName}` : ""}
                      </ThemedText>
                    )}
                    {payment.notes ? (
                      <ThemedText
                        style={[
                          styles.paymentNotes,
                          { color: theme.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {payment.notes}
                      </ThemedText>
                    ) : null}
                    {payment.is_abono && payment.service_total ? (
                      <ThemedText
                        style={[
                          styles.paymentNotes,
                          { color: theme.textMuted },
                        ]}
                      >
                        Servicio total {currencySymbol}
                        {parseFloat(payment.service_total).toFixed(0)}
                      </ThemedText>
                    ) : null}
                    {pendiente != null && pendiente > 0.01 && (
                      <View style={styles.pendienteRow}>
                        <ThemedText
                          style={[
                            styles.paymentNotes,
                            { color: theme.primary, fontWeight: "600" },
                          ]}
                        >
                          Pendiente {currencySymbol} {pendiente.toFixed(2)}
                        </ThemedText>
                        {isAdmin && (
                          <Pressable
                            style={[
                              styles.completarBtn,
                              {
                                backgroundColor: theme.primary + "18",
                                borderColor: theme.primary,
                              },
                            ]}
                            onPress={() => {
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light,
                              );
                              openNewPayment(
                                payment.appointment_id ?? undefined,
                                "completar",
                              );
                            }}
                          >
                            <Feather
                              name="plus-circle"
                              size={11}
                              color={theme.primary}
                            />
                            <ThemedText
                              style={[
                                styles.completarBtnText,
                                { color: theme.primary },
                              ]}
                            >
                              Cobrar restante
                            </ThemedText>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                  <ThemedText
                    style={[styles.paymentAmount, { color: Colors.light.gold }]}
                  >
                    {currencySymbol}{parseFloat(payment.amount).toFixed(2)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {isAdmin && (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => openNewPayment()}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Modal registrar / editar pago */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
              isTablet && styles.modalContentTablet,
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingPayment ? "Editar pago" : "Nuevo pago"}
              </ThemedText>
              <Pressable
                onPress={closeModal}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing.xl }}
            >
              {/* Tipo de pago: 3 chips */}
              {!editingPayment && (
                <>
                  <ThemedText
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    Tipo de pago
                  </ThemedText>
                  <View style={styles.paymentTypeRow}>
                    {(
                      [
                        {
                          id: "full" as PaymentType,
                          label: "Pago completo",
                          icon: "check-circle" as const,
                        },
                        {
                          id: "abono" as PaymentType,
                          label: "Adelanto 20%",
                          icon: "smartphone" as const,
                        },
                        {
                          id: "completar" as PaymentType,
                          label: "Completar 80%",
                          icon: "refresh-cw" as const,
                        },
                      ] as const
                    ).map((t) => (
                      <Pressable
                        key={t.id}
                        style={[
                          styles.paymentTypeChip,
                          {
                            borderColor:
                              paymentType === t.id
                                ? theme.primary
                                : theme.border,
                            backgroundColor:
                              paymentType === t.id
                                ? theme.primary + "15"
                                : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => {
                          setPaymentType(t.id);
                          setFormData((p) => ({
                            ...p,
                            amount: "",
                            serviceTotal: "",
                          }));
                          // Re-sugerir monto si hay cita seleccionada
                          if (selectedAppointmentId) {
                            const apt = recentAppointments.find(
                              (a) => a.id === selectedAppointmentId,
                            );
                            const abono =
                              abonoPrevioByApt[selectedAppointmentId];
                            if (t.id === "completar" && abono) {
                              setFormData((p) => ({
                                ...p,
                                amount: (
                                  abono.service_total - abono.amount
                                ).toFixed(2),
                                serviceTotal: "",
                              }));
                            } else if (t.id === "full" && apt && !abono) {
                              setFormData((p) => ({
                                ...p,
                                amount: parseFloat(String(apt.price)).toFixed(
                                  2,
                                ),
                                serviceTotal: "",
                              }));
                            }
                          }
                        }}
                      >
                        <Feather
                          name={t.icon}
                          size={14}
                          color={
                            paymentType === t.id
                              ? theme.primary
                              : theme.textMuted
                          }
                        />
                        <ThemedText
                          style={[
                            styles.paymentTypeChipText,
                            {
                              color:
                                paymentType === t.id
                                  ? theme.primary
                                  : theme.text,
                            },
                          ]}
                        >
                          {t.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {paymentType === "abono" ? (
                <>
                  <ThemedText
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    {`Valor total del servicio (${currencySymbol})`}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Ej. 130"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    value={formData.serviceTotal}
                    onChangeText={(text) =>
                      setFormData((p) => ({ ...p, serviceTotal: text }))
                    }
                  />
                  {abonoAmount != null && (
                    <View
                      style={[
                        styles.abonoResult,
                        { backgroundColor: theme.backgroundSecondary },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.abonoResultLabel,
                          { color: theme.textMuted },
                        ]}
                      >
                        {`20% = ${currencySymbol}`}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.abonoResultAmount,
                          { color: Colors.light.gold },
                        ]}
                      >
                        {abonoAmount}
                      </ThemedText>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <ThemedText
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    {`Monto (${currencySymbol})`}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={(text) =>
                      setFormData((p) => ({ ...p, amount: text }))
                    }
                  />
                </>
              )}

              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Método de pago
              </ThemedText>
              <View style={styles.methodRow}>
                {PAYMENT_METHODS.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.methodChip,
                      {
                        borderColor: theme.border,
                        backgroundColor:
                          formData.method === m.id
                            ? theme.primary
                            : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setFormData((p) => ({ ...p, method: m.id }))}
                  >
                    <Feather
                      name={m.icon}
                      size={16}
                      color={
                        formData.method === m.id ? "#FFFFFF" : theme.textMuted
                      }
                    />
                    <ThemedText
                      style={[
                        styles.methodChipText,
                        {
                          color:
                            formData.method === m.id ? "#FFFFFF" : theme.text,
                        },
                      ]}
                    >
                      {m.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {/* Vincular a cita */}
              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Vincular a cita (opcional)
              </ThemedText>
              {recentAppointments.length === 0 ? (
                <ThemedText
                  style={[
                    styles.noAppointmentsText,
                    { color: theme.textMuted },
                  ]}
                >
                  No hay citas recientes para enlazar.
                </ThemedText>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.appointmentChipsContainer}
                >
                  <Pressable
                    style={[
                      styles.appointmentChip,
                      {
                        borderColor: theme.border,
                        backgroundColor:
                          selectedAppointmentId === null
                            ? theme.primary
                            : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setSelectedAppointmentId(null)}
                  >
                    <ThemedText
                      style={[
                        styles.appointmentChipText,
                        {
                          color:
                            selectedAppointmentId === null
                              ? "#FFFFFF"
                              : theme.text,
                        },
                      ]}
                    >
                      Sin cita
                    </ThemedText>
                  </Pressable>
                  {recentAppointments.map((apt) => {
                    const isSelected = selectedAppointmentId === apt.id;
                    const abono = abonoPrevioByApt[apt.id];
                    const pendienteApt = abono
                      ? abono.service_total - abono.amount
                      : null;
                    return (
                      <Pressable
                        key={apt.id}
                        style={[
                          styles.appointmentChip,
                          {
                            borderColor: isSelected
                              ? theme.primary
                              : abono
                                ? Colors.light.gold + "80"
                                : theme.border,
                            backgroundColor: isSelected
                              ? theme.primary
                              : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => onSelectAppointment(apt.id)}
                      >
                        {abono && <View style={styles.abonoChipDot} />}
                        <ThemedText
                          style={[
                            styles.appointmentChipText,
                            { color: isSelected ? "#FFFFFF" : theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {apt.client_name || "Sin nombre"}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.appointmentChipSubText,
                            {
                              color: isSelected
                                ? "rgba(255,255,255,0.8)"
                                : theme.textMuted,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {formatShortDate(apt.date)} · {currencySymbol}
                          {parseFloat(apt.price).toFixed(0)}
                        </ThemedText>
                        {abono && pendienteApt != null && (
                          <ThemedText
                            style={[
                              styles.appointmentChipSubText,
                              {
                                color: isSelected
                                  ? "rgba(255,255,255,0.85)"
                                  : Colors.light.gold,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            Pendiente {currencySymbol}{pendienteApt.toFixed(0)}
                          </ThemedText>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <ThemedText
                style={[styles.inputLabel, { color: theme.textSecondary }]}
              >
                Notas (opcional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Ej. Retoque pestañas, cliente María..."
                placeholderTextColor={theme.textMuted}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData((p) => ({ ...p, notes: text }))
                }
                multiline
              />

              {editingPayment?.appointment_id && (
                <Pressable
                  style={[
                    styles.linkAppointmentButton,
                    { borderColor: theme.primary },
                  ]}
                  onPress={() => {
                    const aptId = editingPayment.appointment_id;
                    closeModal();
                    if (aptId) {
                      const tabNav = navigation.getParent();
                      if (tabNav && "navigate" in tabNav) {
                        (
                          tabNav as {
                            navigate: (
                              a: string,
                              b?: { appointmentId: string },
                            ) => void;
                          }
                        ).navigate("Agenda", { appointmentId: aptId });
                      }
                    }
                  }}
                >
                  <Feather name="calendar" size={18} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.linkAppointmentButtonText,
                      { color: theme.primary },
                    ]}
                  >
                    Ver cita en Agenda
                  </ThemedText>
                </Pressable>
              )}

              {editingPayment && (
                <Pressable
                  style={[styles.deleteButton, { borderColor: theme.error }]}
                  onPress={() => {
                    closeModal();
                    handleDelete(editingPayment);
                  }}
                >
                  <Feather name="trash-2" size={18} color={theme.error} />
                  <ThemedText
                    style={[styles.deleteButtonText, { color: theme.error }]}
                  >
                    Eliminar pago
                  </ThemedText>
                </Pressable>
              )}
            </ScrollView>

            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                (createMutation.isPending || updateMutation.isPending) && {
                  opacity: 0.7,
                },
              ]}
              onPress={handleSubmit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (paymentType === "abono"
                  ? !abonoAmount
                  : !formData.amount.trim())
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.submitButtonText}>
                    {editingPayment ? "Guardar" : "Registrar pago"}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
  },
  revenueCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  revenueCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  revenueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: "700",
  },
  revenueMeta: {
    marginTop: Spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  periodLabel: {
    fontSize: 12,
  },
  transactionCount: {
    fontSize: 12,
  },
  abonoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  abonoIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  chartCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  chartSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  desgloseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  desgloseName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  desgloseAmounts: {
    alignItems: "flex-end",
    gap: 2,
  },
  desgloseLabel: {
    fontSize: 12,
  },
  chartWrapper: {
    position: "relative",
  },
  chartYLabel: {
    position: "absolute",
    top: CHART_PADDING.top,
    right: 0,
    zIndex: 1,
  },
  chartYLabelText: {
    fontSize: 10,
    fontWeight: "600",
  },
  chartSvg: {
    alignSelf: "center",
  },
  chartXLabels: {
    flexDirection: "row",
    marginTop: -CHART_PADDING.bottom + Spacing.xs,
    paddingHorizontal: CHART_PADDING.left,
  },
  chartXLabelItem: {
    alignItems: "center",
  },
  chartXLabelText: {
    fontSize: 10,
    fontWeight: "500",
  },
  noChartData: {
    justifyContent: "center",
    alignItems: "center",
  },
  noChartText: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  paymentCount: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  methodBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethod: {
    fontSize: 15,
    fontWeight: "600",
  },
  abonoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  abonoBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  paymentDate: {
    fontSize: 12,
    marginLeft: 36,
  },
  paymentNotes: {
    fontSize: 12,
    marginLeft: 36,
    marginTop: 2,
  },
  paymentLinkedAppointment: {
    fontSize: 12,
    marginLeft: 36,
    marginTop: 2,
    fontStyle: "italic",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
  kpiRowTablet: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  paymentsGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    paddingTop: Spacing.xl,
    maxHeight: "90%",
  },
  modalContentTablet: {
    borderRadius: BorderRadius.xl,
    width: 560,
    maxHeight: "80%",
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTypeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  paymentTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    flex: 1,
    minWidth: 100,
    justifyContent: "center",
  },
  paymentTypeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  abonoChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.light.gold,
    marginBottom: 2,
  },
  pendienteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginLeft: 36,
    marginTop: 2,
    flexWrap: "wrap",
  },
  completarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  completarBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  abonoToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  abonoToggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 72,
    paddingVertical: Spacing.md,
  },
  abonoResult: {
    flexDirection: "row",
    alignItems: "baseline",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  abonoResultLabel: {
    fontSize: 14,
  },
  abonoResultAmount: {
    fontSize: 20,
    fontWeight: "700",
  },
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  methodChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  noAppointmentsText: {
    fontSize: 13,
  },
  appointmentChipsContainer: {
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  appointmentChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
    maxWidth: 220,
  },
  appointmentChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  appointmentChipSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  linkAppointmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  linkAppointmentButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing["3xl"],
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
