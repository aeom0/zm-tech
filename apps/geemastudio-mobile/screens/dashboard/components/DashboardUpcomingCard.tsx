import React from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";

import {
  DashboardAnimatedView,
  type DashboardAnimatedStyle,
} from "../hooks/useStaggeredAnimation";
import { formatDashboardDateLong } from "../dashboardUtils";
import type { DashboardAppointment } from "../types";
import { dashboardStyles as styles } from "../dashboardStyles";

import { DashboardAppointmentRow } from "./DashboardAppointmentRow";

interface DashboardUpcomingCardProps {
  upcomingAppointments: DashboardAppointment[];
  visibleLimit: number;
  locale: string;
  currencySymbol: string;
  isTablet: boolean;
  theme: {
    backgroundDefault: string;
    border: string;
    primary: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    gold: string;
  };
  cardAnimatedStyle?: DashboardAnimatedStyle;
  getEmployeeColor: (employeeId: string) => string;
  getEmployeeName: (employeeId: string) => string;
  getServiceName: (serviceId: string) => string;
  onOpenAppointment: (appointment: DashboardAppointment) => void;
  onViewAllAgenda: () => void;
}

export function DashboardUpcomingCard({
  upcomingAppointments,
  visibleLimit,
  locale,
  currencySymbol,
  isTablet,
  theme,
  cardAnimatedStyle,
  getEmployeeColor,
  getEmployeeName,
  getServiceName,
  onOpenAppointment,
  onViewAllAgenda,
}: DashboardUpcomingCardProps) {
  const slice = upcomingAppointments.slice(0, visibleLimit);

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
          <ThemedText
            style={[styles.cardSubtitle, { color: theme.textSecondary }]}
          >
            {formatDashboardDateLong(locale)}
          </ThemedText>
        </View>
        {upcomingAppointments.length > 0 && (
          <View
            style={[styles.badge, { backgroundColor: `${theme.primary}18` }]}
          >
            <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
              {upcomingAppointments.length}
            </ThemedText>
          </View>
        )}
      </View>

      {upcomingAppointments.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="calendar" size={24} color={theme.textMuted} />
          </View>
          <ThemedText
            style={[styles.emptyTitle, { color: theme.textSecondary }]}
          >
            Todo despejado por hoy
          </ThemedText>
          <ThemedText
            style={[styles.emptySubtitle, { color: theme.textMuted }]}
          >
            No hay citas programadas
          </ThemedText>
        </View>
      ) : (
        slice.map((appt, i) => (
          <DashboardAppointmentRow
            key={appt.id}
            appointment={appt}
            index={i}
            visibleCount={slice.length}
            theme={theme}
            currencySymbol={currencySymbol}
            locale={locale}
            isTablet={isTablet}
            getEmployeeColor={getEmployeeColor}
            getEmployeeName={getEmployeeName}
            getServiceName={getServiceName}
            onPress={onOpenAppointment}
          />
        ))
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
  );
}
