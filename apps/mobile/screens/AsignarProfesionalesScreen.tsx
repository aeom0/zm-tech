import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { AsignarRow } from './asignar/components/AsignarRow';
import { useAsignarData } from './asignar/hooks/useAsignarData';
import type { UnassignedAppointment, RowAssignState } from './asignar/types';
import type { TenantConfig } from '@salonpro/tenant-config';

interface EmptyStateProps {
  theme: ReturnType<typeof useTheme>['theme'];
  terminology: TenantConfig['terminology'];
}

function EmptyState({ theme, terminology }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      <Feather name="users" size={48} color={theme.success} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        Todo asignado
      </ThemedText>
      <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
        No hay {terminology.appointment}s sin{' '}
        {terminology.staffSingular} en los próximos 7 días.
      </ThemedText>
    </View>
  );
}

export default function AsignarProfesionalesScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { employees, unassigned, isLoading, refetch, assignMutation, config } =
    useAsignarData();

  // Estado de guardado por fila
  const [rowSaving, setRowSaving] = useState<RowAssignState>({});

  const handleAssign = useCallback(
    async (appointmentId: string, employeeId: string) => {
      if (rowSaving[appointmentId]) return;
      setRowSaving(prev => ({ ...prev, [appointmentId]: true }));
      try {
        await assignMutation.mutateAsync({ appointmentId, employeeId });
      } finally {
        setRowSaving(prev => {
          const next = { ...prev };
          delete next[appointmentId];
          return next;
        });
      }
    },
    [rowSaving, assignMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: UnassignedAppointment }) => (
      <AsignarRow
        item={item}
        employees={employees}
        isSaving={rowSaving[item.id] ?? false}
        onAssign={employeeId => handleAssign(item.id, employeeId)}
        locale={config.locale.language}
      />
    ),
    [employees, rowSaving, handleAssign, config.locale.language],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={unassigned}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState theme={theme} terminology={config.terminology} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing['5xl'],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
});
