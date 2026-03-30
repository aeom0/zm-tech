import React from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTenant } from "@/contexts/TenantContext";
import { formatCurrency } from "@/utils/format";
import { ClientAppointmentRow } from "./ClientAppointmentRow";
import type { ClientWithMetrics } from "../types";
import { useClientDetail } from "../hooks/useClientDetail";

interface Props {
  visible: boolean;
  client: ClientWithMetrics | null;
  onClose: () => void;
}

export function ClientDetailModal({ visible, client, onClose }: Props) {
  const { theme } = useTheme();
  const { config } = useTenant();

  const { data: appointments = [], isLoading } = useClientDetail(
    client?.id ?? null,
  );

  if (!client) return null;

  // Calcular métricas desde el historial enriquecido
  const total_visits = appointments.length;
  const total_spent = appointments.reduce((sum, a) => sum + a.total_paid, 0);
  const avg_ticket = total_visits > 0 ? total_spent / total_visits : 0;

  const serviceFrequency: Record<string, number> = {};
  for (const apt of appointments) {
    for (const svc of apt.services) {
      serviceFrequency[svc.name] = (serviceFrequency[svc.name] ?? 0) + 1;
    }
  }
  const [favoriteName] =
    Object.entries(serviceFrequency).sort((a, b) => b[1] - a[1])[0] ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View
          style={[styles.content, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Detalle de cliente</ThemedText>
              <ThemedText
                style={[styles.subtitle, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {client.name}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
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
            contentContainerStyle={{ paddingBottom: Spacing["3xl"] }}
          >
            <View
              style={[
                styles.metricsCard,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <ThemedText
                    style={[styles.metricLabel, { color: theme.textMuted }]}
                  >
                    Visitas
                  </ThemedText>
                  <ThemedText
                    style={[styles.metricValue, { color: theme.text }]}
                  >
                    {isLoading ? "..." : total_visits}
                  </ThemedText>
                </View>
                <View style={styles.metric}>
                  <ThemedText
                    style={[styles.metricLabel, { color: theme.textMuted }]}
                  >
                    Total gastado
                  </ThemedText>
                  <ThemedText
                    style={[styles.metricValue, { color: theme.gold }]}
                  >
                    {isLoading ? "..." : formatCurrency(total_spent, config)}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <ThemedText
                    style={[styles.metricLabel, { color: theme.textMuted }]}
                  >
                    Ticket promedio
                  </ThemedText>
                  <ThemedText
                    style={[styles.metricValue, { color: theme.info }]}
                  >
                    {isLoading ? "..." : formatCurrency(avg_ticket, config)}
                  </ThemedText>
                </View>
                <View style={styles.metric}>
                  <ThemedText
                    style={[styles.metricLabel, { color: theme.textMuted }]}
                  >
                    Servicio favorito
                  </ThemedText>
                  <ThemedText
                    style={[styles.metricValue, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {isLoading ? "..." : (favoriteName ?? "—")}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                Historial de citas
              </ThemedText>
              <ThemedText
                style={[styles.sectionCount, { color: theme.textSecondary }]}
              >
                {appointments.length}
              </ThemedText>
            </View>

            {appointments.length === 0 && !isLoading ? (
              <ThemedText
                style={[styles.emptyText, { color: theme.textMuted }]}
              >
                Aún no hay citas registradas para esta persona.
              </ThemedText>
            ) : (
              appointments.map((apt) => (
                <ClientAppointmentRow
                  key={apt.id}
                  appointment={apt}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  metricsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    marginBottom: Spacing.xl,
  },
});
