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
import { ValidacionRow } from './validacion/components/ValidacionRow';
import { useValidacionData } from './validacion/hooks/useValidacionData';
import type { PendingAppointment, VerificationAction, RowLoadingState } from './validacion/types';

export default function ValidacionPagosScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { pending, isLoading, isError, refetch, verifyMutation } = useValidacionData();

  // Estado per-row: { [appointmentId]: 'approved' | 'rejected' | null }
  const [rowLoading, setRowLoading] = useState<RowLoadingState>({});

  const handleVerify = useCallback(
    async (appointmentId: string, action: VerificationAction) => {
      if (rowLoading[appointmentId]) return; // ya procesando este item
      setRowLoading(prev => ({ ...prev, [appointmentId]: action }));
      try {
        await verifyMutation.mutateAsync({ appointmentId, action });
      } finally {
        setRowLoading(prev => {
          const next = { ...prev };
          delete next[appointmentId];
          return next;
        });
      }
    },
    [rowLoading, verifyMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: PendingAppointment }) => (
      <ValidacionRow
        item={item}
        loadingAction={rowLoading[item.id] ?? null}
        onApprove={() => handleVerify(item.id, 'approved')}
        onReject={() => handleVerify(item.id, 'rejected')}
      />
    ),
    [rowLoading, handleVerify],
  );

  const EmptyState = () => (
    <View style={styles.empty}>
      <Feather name="check-circle" size={48} color={theme.success} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        Todo al día
      </ThemedText>
      <ThemedText style={[styles.emptySub, { color: theme.textMuted }]}>
        No hay pagos pendientes de validación.
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={pending}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing['3xl'],
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        ListEmptyComponent={isLoading ? null : <EmptyState />}
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
