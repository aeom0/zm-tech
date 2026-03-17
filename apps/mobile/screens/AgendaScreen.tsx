import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useResponsive } from "@/hooks/useResponsive";
import { useTenant } from "@/contexts/TenantContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 10);
const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface Appointment {
  id: string;
  client_name: string;
  client_phone?: string | null;
  client_document?: string | null;
  date: string;
  duration: number;
  price: string;
  status: string;
  employee_id: string;
  service_id: string;
}

interface Employee {
  id: string;
  name: string;
  color: string;
  role: string;
}

interface Service {
  id: string;
  name: string;
  price: string;
  duration: number;
  category_id: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  order: number;
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
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
    useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleHour, setRescheduleHour] = useState<number>(10);
  const [selectedHour, setSelectedHour] = useState(9);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "scheduled" | "completed"
  >("all");
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientDocument: "",
    categoryId: "",
    serviceId: "",
    employeeId: "",
  });

  const weekStart = useMemo(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    return date;
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, client_name, client_phone, client_document, date, duration, price, status, employee_id, service_id",
        )
        .order("date", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as Appointment[];
    },
  });

  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
  } = useQuery<Employee[]>({
    queryKey: ["employees"],
  });

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["service_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, order")
        .order("order", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as ServiceCategory[];
    },
  });

  const {
    data: services = [],
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration, category_id")
        .order("created_at", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as Service[];
    },
  });

  const servicesByCategory = useMemo(() => {
    if (!formData.categoryId) return [];
    return services.filter((s) => s.category_id === formData.categoryId);
  }, [services, formData.categoryId]);

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

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

  const createMutation = useMutation({
    mutationFn: async (data: {
      client_name: string;
      client_phone?: string;
      client_document?: string;
      service_id: string;
      employee_id: string;
      date: string;
      duration: number;
      price: string;
      status: string;
    }) => {
      const payload = {
        client_name: data.client_name,
        client_phone: data.client_phone ?? null,
        client_document: data.client_document ?? null,
        service_id: data.service_id,
        employee_id: data.employee_id,
        date: data.date,
        duration: data.duration,
        price: data.price,
        status: data.status,
      };

      const { error } = await supabase.from("appointments").insert(payload);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      setModalVisible(false);
      setFormData({
        clientName: "",
        clientPhone: "",
        clientDocument: "",
        categoryId: "",
        serviceId: "",
        employeeId: "",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo crear la cita");
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      setDetailModalVisible(false);
      setAppointmentDetail(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo eliminar la cita");
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ date })
        .eq("id", id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      setDetailModalVisible(false);
      setAppointmentDetail(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo reprogramar la cita");
    },
  });

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);

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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      const sameDay = aptDate.toDateString() === date.toDateString();
      const sameHour = aptDate.getHours() === hour;
      const statusMatches =
        statusFilter === "all" ? true : apt.status === statusFilter;
      return sameDay && sameHour && statusMatches;
    });
  };

  // Vista tablet: citas por chica en una hora/día concretos
  const getAptsForEmpSlot = (date: Date, hour: number, empId: string) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      const sameDay = aptDate.toDateString() === date.toDateString();
      const sameHour = aptDate.getHours() === hour;
      const statusMatches =
        statusFilter === "all" ? true : apt.status === statusFilter;
      return sameDay && sameHour && statusMatches && apt.employee_id === empId;
    });
  };

  const changeDay = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getEmployeeColor = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.color || Colors.light.violet;
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name?.split(" ")[0] || "";
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.name || "";
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

  const openAppointmentDetail = (apt: Appointment) => {
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
      Alert.alert("Error", "Selecciona una chica");
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header — tablet: selector de día, phone: selector de semana */}
      <View
        style={[
          styles.header,
          {
            paddingTop: headerHeight + Spacing.sm,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        {isTablet ? (
          <>
            <Pressable onPress={() => changeDay(-1)} style={styles.navButton}>
              <Feather name="chevron-left" size={28} color={theme.primary} />
            </Pressable>
            <Pressable onPress={goToToday} style={styles.dayTitleContainer}>
              <ThemedText style={[styles.weekTitle, { fontSize: 18 }]}>
                {selectedDate.toLocaleDateString("es-PE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </ThemedText>
              {!isToday(selectedDate) && (
                <ThemedText
                  style={[
                    styles.todayBadge,
                    { color: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  Hoy
                </ThemedText>
              )}
            </Pressable>
            <Pressable onPress={() => changeDay(1)} style={styles.navButton}>
              <Feather name="chevron-right" size={28} color={theme.primary} />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => changeWeek(-1)} style={styles.navButton}>
              <Feather name="chevron-left" size={24} color={theme.primary} />
            </Pressable>
            <Pressable onPress={goToToday}>
              <ThemedText style={styles.weekTitle}>
                {weekDays[0].toLocaleDateString("es-PE", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {weekDays[6].toLocaleDateString("es-PE", {
                  month: "short",
                  day: "numeric",
                })}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => changeWeek(1)} style={styles.navButton}>
              <Feather name="chevron-right" size={24} color={theme.primary} />
            </Pressable>
          </>
        )}
      </View>

      {/* Day headers — solo en phone (vista semana) */}
      {!isTablet && (
        <View style={[styles.dayHeaders, { borderBottomColor: theme.border }]}>
          <View style={[styles.timeColumn, { width: TIME_COL_W }]} />
          {weekDays.map((date, index) => (
            <View
              key={index}
              style={[
                styles.dayHeader,
                isToday(date) && {
                  backgroundColor: theme.primary + "12",
                  borderRadius: BorderRadius.xs,
                },
              ]}
            >
              <ThemedText style={[styles.dayName, { color: theme.textMuted }]}>
                {DAYS_ES[date.getDay()]}
              </ThemedText>
              <ThemedText
                style={[
                  styles.dayNumber,
                  isToday(date) && {
                    color: theme.primary,
                    fontWeight: "700",
                  },
                ]}
              >
                {date.getDate()}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Employee headers — solo en tablet */}
      {isTablet && (
        <View
          style={[
            styles.employeeHeaders,
            {
              borderBottomColor: theme.border,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          <View style={{ width: TIME_COL_W }} />
          {employees.map((emp) => (
            <View
              key={emp.id}
              style={[
                styles.empHeader,
                {
                  width:
                    (width - TIME_COL_W - Spacing.sm * 2) /
                    Math.max(employees.length, 1),
                  borderLeftColor: emp.color,
                },
              ]}
            >
              <View style={[styles.empDot, { backgroundColor: emp.color }]} />
              <ThemedText
                style={[styles.empHeaderName, { color: theme.text }]}
                numberOfLines={1}
              >
                {emp.name.split(" ")[0]}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Status filter */}
      <View style={styles.statusFilterContainer}>
        {[
          { id: "all" as const, label: "Todas" },
          { id: "scheduled" as const, label: "Pendientes" },
          { id: "completed" as const, label: "Completadas" },
        ].map((opt) => {
          const isActive = statusFilter === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[
                styles.statusChip,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : theme.backgroundSecondary,
                  borderColor: isActive ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                setStatusFilter(opt.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <ThemedText
                style={[
                  styles.statusChipText,
                  { color: isActive ? "#FFFFFF" : theme.text },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Calendar grid */}
      <ScrollView
        style={styles.calendarContainer}
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        {HOURS.map((hour) => {
          if (isTablet) {
            // Vista tablet: columnas por chica
            const empColWidth =
              (width - TIME_COL_W - Spacing.sm * 2) /
              Math.max(employees.length, 1);
            const maxInRow = Math.max(
              1,
              ...employees.map(
                (e) => getAptsForEmpSlot(selectedDate, hour, e.id).length,
              ),
            );
            const rowMinHeight = 64 + maxInRow * 52;
            return (
              <View
                key={hour}
                style={[styles.hourRow, { minHeight: rowMinHeight }]}
              >
                <View style={[styles.timeColumn, { width: TIME_COL_W }]}>
                  <ThemedText
                    style={[
                      styles.timeText,
                      { color: theme.textMuted, fontSize: 12 },
                    ]}
                  >
                    {hour}:00
                  </ThemedText>
                </View>
                {employees.map((emp) => {
                  const apts = getAptsForEmpSlot(selectedDate, hour, emp.id);
                  return (
                    <Pressable
                      key={emp.id}
                      style={[
                        styles.empSlot,
                        {
                          width: empColWidth,
                          borderColor: theme.border,
                          minHeight: rowMinHeight,
                        },
                      ]}
                      onPress={() => openNewAppointment(selectedDate, hour)}
                    >
                      {apts.map((apt) => (
                        <Pressable
                          key={apt.id}
                          style={[
                            styles.aptBlock,
                            {
                              backgroundColor: emp.color + "20",
                              borderLeftColor: emp.color,
                            },
                          ]}
                          onPress={() => openAppointmentDetail(apt)}
                        >
                          <ThemedText
                            style={[styles.aptClient, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {apt.client_name}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.aptService,
                              { color: theme.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {getServiceName(apt.service_id)}
                          </ThemedText>
                          {apt.client_phone && (
                            <ThemedText
                              style={[
                                styles.aptSub,
                                { color: theme.textMuted },
                              ]}
                              numberOfLines={1}
                            >
                              {apt.client_phone}
                            </ThemedText>
                          )}
                        </Pressable>
                      ))}
                    </Pressable>
                  );
                })}
              </View>
            );
          }

          // Vista phone: grilla por semana (comportamiento original)
          const maxInSlot = Math.max(
            1,
            ...weekDays.map((d) => getAppointmentsForSlot(d, hour).length),
          );
          const rowMinHeight = 56 + maxInSlot * 28;
          return (
            <View
              key={hour}
              style={[styles.hourRow, { minHeight: rowMinHeight }]}
            >
              <View style={[styles.timeColumn, { width: TIME_COL_W }]}>
                <ThemedText
                  style={[styles.timeText, { color: theme.textMuted }]}
                >
                  {hour}:00
                </ThemedText>
              </View>
              {weekDays.map((date, dayIndex) => {
                const slotAppointments = getAppointmentsForSlot(date, hour);
                return (
                  <Pressable
                    key={dayIndex}
                    style={[styles.timeSlot, { borderColor: theme.border }]}
                    onPress={() => openNewAppointment(date, hour)}
                  >
                    {slotAppointments.map((apt) => (
                      <Pressable
                        key={apt.id}
                        style={[
                          styles.appointmentChip,
                          {
                            backgroundColor:
                              getEmployeeColor(apt.employee_id) + "20",
                            borderLeftColor: getEmployeeColor(apt.employee_id),
                          },
                        ]}
                        onPress={() => openAppointmentDetail(apt)}
                      >
                        <ThemedText
                          style={[styles.chipName, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {apt.client_name}
                        </ThemedText>
                        {(apt.client_phone || apt.client_document) && (
                          <ThemedText
                            style={[styles.chipSub, { color: theme.textMuted }]}
                            numberOfLines={1}
                          >
                            {[apt.client_phone, apt.client_document]
                              .filter(Boolean)
                              .join(" · ")}
                          </ThemedText>
                        )}
                        <ThemedText
                          style={[
                            styles.chipEmployee,
                            { color: getEmployeeColor(apt.employee_id) },
                          ]}
                          numberOfLines={1}
                        >
                          {getEmployeeName(apt.employee_id)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: NUEVA CITA
      ═══════════════════════════════════════════════════════════ */}
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <ThemedText style={styles.modalTitle}>Nueva Cita</ThemedText>
                <ThemedText
                  style={[styles.modalSubtitle, { color: theme.textMuted }]}
                >
                  {formatDate(selectedDate)} a las {selectedHour}:00
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
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
              {/* Cliente */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Feather name="user" size={16} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Clienta
                  </ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  placeholder="Nombre de la clienta"
                  placeholderTextColor={theme.textMuted}
                  value={formData.clientName}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, clientName: text }))
                  }
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                      marginTop: Spacing.sm,
                    },
                  ]}
                  placeholder="Teléfono (opcional)"
                  placeholderTextColor={theme.textMuted}
                  value={formData.clientPhone}
                  keyboardType="phone-pad"
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, clientPhone: text }))
                  }
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                      marginTop: Spacing.sm,
                    },
                  ]}
                  placeholder="DNI (opcional)"
                  placeholderTextColor={theme.textMuted}
                  value={formData.clientDocument}
                  keyboardType="number-pad"
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, clientDocument: text }))
                  }
                />
              </View>

              {/* Categoría */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Feather name="grid" size={16} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Categoría
                  </ThemedText>
                </View>
                {categories.length === 0 ? (
                  <ThemedText
                    style={[styles.emptyText, { color: theme.textMuted }]}
                  >
                    No hay categorías. Crea categorías en Servicios.
                  </ThemedText>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                  >
                    {categories.map((cat) => {
                      const isSelected = formData.categoryId === cat.id;
                      return (
                        <Pressable
                          key={cat.id}
                          style={[
                            styles.serviceChip,
                            { borderColor: theme.border },
                            isSelected && {
                              backgroundColor: theme.primary,
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() =>
                            setFormData((prev) => {
                              const firstInCat = services.find(
                                (s) => s.category_id === cat.id,
                              );
                              return {
                                ...prev,
                                categoryId: cat.id,
                                serviceId: firstInCat?.id ?? "",
                              };
                            })
                          }
                        >
                          <ThemedText
                            style={[
                              styles.serviceChipName,
                              isSelected && { color: "#FFFFFF" },
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Servicio (según categoría) */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Feather name="list" size={16} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Servicio
                  </ThemedText>
                </View>

                {servicesLoading ? (
                  <ActivityIndicator
                    color={theme.primary}
                    style={{ padding: Spacing.lg }}
                  />
                ) : servicesError ? (
                  <View
                    style={[
                      styles.emptyState,
                      { backgroundColor: theme.error + "15" },
                    ]}
                  >
                    <Feather name="wifi-off" size={20} color={theme.error} />
                    <ThemedText
                      style={[styles.emptyText, { color: theme.error }]}
                    >
                      Error al cargar servicios.
                    </ThemedText>
                  </View>
                ) : !formData.categoryId ? (
                  <ThemedText
                    style={[styles.emptyText, { color: theme.textMuted }]}
                  >
                    Elige primero una categoría.
                  </ThemedText>
                ) : servicesByCategory.length === 0 ? (
                  <ThemedText
                    style={[styles.emptyText, { color: theme.textMuted }]}
                  >
                    No hay servicios en {selectedCategory?.name}.
                  </ThemedText>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                  >
                    {servicesByCategory.map((service) => {
                      const isSelected = formData.serviceId === service.id;
                      return (
                        <Pressable
                          key={service.id}
                          style={[
                            styles.serviceChip,
                            { borderColor: theme.border },
                            isSelected && {
                              backgroundColor: theme.primary,
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() =>
                            setFormData((prev) => ({
                              ...prev,
                              serviceId: service.id,
                            }))
                          }
                        >
                          <ThemedText
                            style={[
                              styles.serviceChipName,
                              isSelected && { color: "#FFFFFF" },
                            ]}
                            numberOfLines={1}
                          >
                            {service.name}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.serviceChipDetail,
                              {
                                color: isSelected
                                  ? "rgba(255,255,255,0.8)"
                                  : theme.textMuted,
                              },
                            ]}
                          >
                            {currencySymbol} {service.price} ·{" "}
                            {service.duration} min
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Chica */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Feather name="heart" size={16} color={theme.primary} />
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Chica
                  </ThemedText>
                </View>

                {employeesLoading ? (
                  <ActivityIndicator
                    color={theme.primary}
                    style={{ padding: Spacing.lg }}
                  />
                ) : employeesError ? (
                  <View
                    style={[
                      styles.emptyState,
                      { backgroundColor: theme.error + "15" },
                    ]}
                  >
                    <Feather name="wifi-off" size={20} color={theme.error} />
                    <ThemedText
                      style={[styles.emptyText, { color: theme.error }]}
                    >
                      Error al cargar chicas. Verifica que el servidor esté
                      activo.
                    </ThemedText>
                  </View>
                ) : employees.length === 0 ? (
                  <View
                    style={[
                      styles.emptyState,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name="alert-circle"
                      size={20}
                      color={theme.textMuted}
                    />
                    <ThemedText
                      style={[styles.emptyText, { color: theme.textMuted }]}
                    >
                      No hay chicas registradas. Agrega personal primero.
                    </ThemedText>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                  >
                    {employees.map((employee) => {
                      const isSelected = formData.employeeId === employee.id;
                      return (
                        <Pressable
                          key={employee.id}
                          style={[
                            styles.employeeChip,
                            {
                              borderColor: employee.color,
                              backgroundColor: isSelected
                                ? employee.color
                                : "transparent",
                            },
                          ]}
                          onPress={() =>
                            setFormData((prev) => ({
                              ...prev,
                              employeeId: employee.id,
                            }))
                          }
                        >
                          <View
                            style={[
                              styles.employeeAvatar,
                              {
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.3)"
                                  : employee.color + "20",
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.employeeInitial,
                                {
                                  color: isSelected
                                    ? "#FFFFFF"
                                    : employee.color,
                                },
                              ]}
                            >
                              {employee.name[0]}
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={[
                              styles.employeeChipName,
                              isSelected && { color: "#FFFFFF" },
                            ]}
                          >
                            {employee.name.split(" ")[0]}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* Resumen */}
              {formData.serviceId && formData.employeeId && (
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.summaryTitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Resumen de la cita
                  </ThemedText>
                  <View style={styles.summaryRow}>
                    <ThemedText
                      style={[styles.summaryLabel, { color: theme.textMuted }]}
                    >
                      Servicio
                    </ThemedText>
                    <ThemedText
                      style={[styles.summaryValue, { color: theme.text }]}
                    >
                      {selectedService?.name || "—"}
                    </ThemedText>
                  </View>
                  <View style={styles.summaryRow}>
                    <ThemedText
                      style={[styles.summaryLabel, { color: theme.textMuted }]}
                    >
                      Chica
                    </ThemedText>
                    <View style={styles.summaryEmployeeRow}>
                      <View
                        style={[
                          styles.summaryDot,
                          { backgroundColor: selectedEmployee?.color },
                        ]}
                      />
                      <ThemedText
                        style={[styles.summaryValue, { color: theme.text }]}
                      >
                        {selectedEmployee?.name || "—"}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <ThemedText
                      style={[styles.summaryLabel, { color: theme.textMuted }]}
                    >
                      Duración
                    </ThemedText>
                    <ThemedText
                      style={[styles.summaryValue, { color: theme.text }]}
                    >
                      {selectedService?.duration || 60} min
                    </ThemedText>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryRowLast]}>
                    <ThemedText
                      style={[styles.summaryLabel, { color: theme.textMuted }]}
                    >
                      Precio
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.summaryPrice,
                        { color: Colors.light.gold },
                      ]}
                    >
                      {currencySymbol} {selectedService?.price || "0"}
                    </ThemedText>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Submit button */}
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                createMutation.isPending && { opacity: 0.7 },
              ]}
              onPress={handleCreateAppointment}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="calendar" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.submitButtonText}>
                    Crear Cita
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal detalle cita: Eliminar / Reprogramar */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
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
            {appointmentDetail && (
              <>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Cita</ThemedText>
                  <Pressable
                    onPress={() => {
                      setDetailModalVisible(false);
                      setAppointmentDetail(null);
                    }}
                    style={[
                      styles.closeButton,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather name="x" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.summaryLabel, { color: theme.textMuted }]}
                  >
                    Clienta
                  </ThemedText>
                  <ThemedText
                    style={[styles.summaryValue, { color: theme.text }]}
                  >
                    {appointmentDetail.client_name}
                  </ThemedText>
                  {appointmentDetail.client_phone ? (
                    <ThemedText
                      style={[
                        styles.summaryValue,
                        { color: theme.text, fontSize: 14 },
                      ]}
                    >
                      Tel: {appointmentDetail.client_phone}
                    </ThemedText>
                  ) : null}
                  {appointmentDetail.client_document ? (
                    <ThemedText
                      style={[
                        styles.summaryValue,
                        { color: theme.text, fontSize: 14 },
                      ]}
                    >
                      DNI: {appointmentDetail.client_document}
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: theme.textMuted, marginTop: Spacing.md },
                    ]}
                  >
                    Servicio
                  </ThemedText>
                  <ThemedText
                    style={[styles.summaryValue, { color: theme.text }]}
                  >
                    {services.find((s) => s.id === appointmentDetail.service_id)
                      ?.name ?? "—"}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.summaryLabel,
                      { color: theme.textMuted, marginTop: Spacing.sm },
                    ]}
                  >
                    {new Date(appointmentDetail.date).toLocaleString("es-PE", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </ThemedText>
                </View>

                <View style={styles.formSection}>
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Reprogramar a
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsContainer}
                  >
                    {weekDays.map((d) => {
                      const isSelected =
                        rescheduleDate?.toDateString() === d.toDateString();
                      return (
                        <Pressable
                          key={d.toISOString()}
                          style={[
                            styles.serviceChip,
                            { borderColor: theme.border },
                            isSelected && {
                              backgroundColor: theme.primary,
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() => setRescheduleDate(d)}
                        >
                          <ThemedText
                            style={[
                              styles.serviceChipName,
                              isSelected && { color: "#FFFFFF" },
                            ]}
                          >
                            {DAYS_ES[d.getDay()]} {d.getDate()}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.chipsContainer,
                      { marginTop: Spacing.sm },
                    ]}
                  >
                    {HOURS.map((h) => {
                      const isSelected = rescheduleHour === h;
                      return (
                        <Pressable
                          key={h}
                          style={[
                            styles.employeeChip,
                            { borderColor: theme.border },
                            isSelected && {
                              backgroundColor: theme.primary,
                              borderColor: theme.primary,
                            },
                          ]}
                          onPress={() => setRescheduleHour(h)}
                        >
                          <ThemedText
                            style={[
                              styles.employeeChipName,
                              isSelected && { color: "#FFFFFF" },
                            ]}
                          >
                            {h}:00
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <Pressable
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: theme.primary,
                      marginBottom: Spacing.sm,
                    },
                  ]}
                  onPress={handleReschedule}
                  disabled={updateAppointmentMutation.isPending}
                >
                  {updateAppointmentMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="calendar" size={18} color="#FFFFFF" />
                      <ThemedText style={styles.submitButtonText}>
                        Reprogramar
                      </ThemedText>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[
                    styles.submitButton,
                    { backgroundColor: theme.error },
                  ]}
                  onPress={handleDeleteAppointment}
                  disabled={deleteAppointmentMutation.isPending}
                >
                  {deleteAppointmentMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="trash-2" size={18} color="#FFFFFF" />
                      <ThemedText style={styles.submitButtonText}>
                        Eliminar cita
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              </>
            )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  navButton: {
    padding: Spacing.sm,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayHeaders: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  statusFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    justifyContent: "center",
  },
  todayBadge: {
    fontSize: 12,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  employeeHeaders: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  empHeader: {
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 3,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  empDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  empHeaderName: {
    fontSize: 13,
    fontWeight: "600",
  },
  empSlot: {
    borderLeftWidth: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  aptBlock: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 6,
    marginBottom: 4,
  },
  aptClient: {
    fontSize: 13,
    fontWeight: "600",
  },
  aptService: {
    fontSize: 11,
    marginTop: 1,
  },
  aptSub: {
    fontSize: 10,
    marginTop: 1,
  },
  timeColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "500",
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "500",
  },
  calendarContainer: {
    flex: 1,
  },
  hourRow: {
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: Spacing.sm,
  },
  timeText: {
    fontSize: 11,
  },
  timeSlot: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 4,
    margin: 1,
    padding: 2,
    minHeight: 56,
  },
  appointmentChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderLeftWidth: 3,
    marginBottom: 2,
  },
  chipName: {
    fontSize: 10,
    fontWeight: "600",
  },
  chipSub: {
    fontSize: 8,
    fontWeight: "500",
    marginTop: 1,
  },
  chipEmployee: {
    fontSize: 8,
    fontWeight: "500",
  },

  // ── Modal ──
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
    maxHeight: "85%",
  },
  modalContentTablet: {
    borderRadius: BorderRadius.xl,
    width: 560,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Form sections ──
  formSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  chipsContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  emptyText: {
    fontSize: 13,
    flex: 1,
  },

  // ── Service chips ──
  serviceChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 120,
  },
  serviceChipName: {
    fontSize: 14,
    fontWeight: "600",
  },
  serviceChipDetail: {
    fontSize: 11,
    marginTop: 2,
  },

  // ── Employee chips ──
  employeeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  employeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeInitial: {
    fontSize: 13,
    fontWeight: "700",
  },
  employeeChipName: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Summary card ──
  summaryCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryEmployeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: "700",
  },

  // ── Submit ──
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
