import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTenant } from "@/contexts/TenantContext";
import { Spacing } from "@/constants/theme";
import { useClientsData } from "./clients/hooks/useClientsData";
import type { ClientSegment, ClientWithMetrics } from "./clients/types";
import { ClientsHeader } from "./clients/components/ClientsHeader";
import { ClientFilterBar } from "./clients/components/ClientFilterBar";
import { ClientKPIStrip } from "./clients/components/ClientKPIStrip";
import { ClientCard } from "./clients/components/ClientCard";
import { ClientDetailModal } from "./clients/components/ClientDetailModal";

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { config } = useTenant();

  const [searchQuery, setSearchQuery] = useState("");
  const [segment, setSegment] = useState<ClientSegment>("all");
  const [selectedClient, setSelectedClient] =
    useState<ClientWithMetrics | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { clients, filteredClients, kpis, isLoading, isError } =
    useClientsData(searchQuery, segment);

  const handleOpenDetail = (client: ClientWithMetrics) => {
    setSelectedClient(client);
    setDetailVisible(true);
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setSelectedClient(null);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {}}
            tintColor={theme.primary}
          />
        }
      >
        <ThemedText
          style={[styles.title, { color: theme.text }]}
        >
          Clientes
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Revisa el comportamiento de tus clientes y segmenta por frecuencia.
        </ThemedText>

        <ClientsHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={clients.length}
        />

        <ClientFilterBar
          segment={segment}
          onSegmentChange={setSegment}
        />

        <ClientKPIStrip kpis={kpis} />

        {isError ? (
          <ThemedText
            style={[styles.errorText, { color: theme.error }]}
          >
            Hubo un problema al cargar los clientes. Intenta de nuevo más
            tarde.
          </ThemedText>
        ) : filteredClients.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <ThemedText
              style={[styles.emptyTitle, { color: theme.textSecondary }]}
            >
              Aún no hay clientes registrados
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: theme.textMuted }]}
            >
              Cuando registres citas con datos de contacto, podrás ver aquí a
              todas las personas que han pasado por tu negocio.
            </ThemedText>
          </View>
        ) : (
          filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              segment={segment}
              onPress={() => handleOpenDetail(client)}
            />
          ))
        )}
      </ScrollView>

      <ClientDetailModal
        visible={detailVisible}
        client={selectedClient}
        onClose={handleCloseDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 13,
    marginTop: Spacing.lg,
  },
  emptyState: {
    paddingVertical: Spacing["2xl"],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
  },
});

