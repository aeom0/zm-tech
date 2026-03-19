import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useTenant } from '@/contexts/TenantContext';
import { formatCurrency } from '@/utils/format';
import { Spacing, BorderRadius } from '@/constants/theme';
import type { PendingAppointment, VerificationAction } from '../types';

interface ValidacionRowProps {
  item: PendingAppointment;
  loadingAction: VerificationAction | null; // null = sin spinner
  onApprove: () => void;
  onReject: () => void;
}

export function ValidacionRow({
  item,
  loadingAction,
  onApprove,
  onReject,
}: ValidacionRowProps) {
  const { theme } = useTheme();
  const { config } = useTenant();

  const isLoading = loadingAction !== null;

  const fecha = new Date(item.date).toLocaleString(config.locale.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Franja de color del empleado */}
      {item.employeeColor && (
        <View
          style={[styles.colorBar, { backgroundColor: item.employeeColor }]}
        />
      )}

      <View style={styles.body}>
        {/* Info principal */}
        <View style={styles.infoRow}>
          <ThemedText style={[styles.clientName, { color: theme.text }]}>
            {item.client_name}
          </ThemedText>
          <ThemedText style={[styles.price, { color: theme.primary }]}>
            {formatCurrency(item.price, config)}
          </ThemedText>
        </View>

        <ThemedText style={[styles.meta, { color: theme.textSecondary }]}>
          {item.serviceName} · {item.employeeName}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: theme.textMuted }]}>
          {fecha}
        </ThemedText>

        {/* Acciones per-row */}
        <View style={styles.actions}>
          {/* Botón Rechazar */}
          <Pressable
            style={({ pressed }) => [
              styles.btnReject,
              {
                borderColor: theme.error,
                opacity: pressed || isLoading ? 0.7 : 1,
              },
            ]}
            onPress={onReject}
            disabled={isLoading}
          >
            {loadingAction === 'rejected' ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <>
                <Feather name="x" size={16} color={theme.error} />
                <ThemedText style={[styles.btnText, { color: theme.error }]}>
                  Rechazar
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* Botón Aprobar */}
          <Pressable
            style={({ pressed }) => [
              styles.btnApprove,
              {
                backgroundColor: theme.success,
                opacity: pressed || isLoading ? 0.7 : 1,
              },
            ]}
            onPress={onApprove}
            disabled={isLoading}
          >
            {loadingAction === 'approved' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={16} color="#FFFFFF" />
                <ThemedText style={[styles.btnText, { color: '#FFFFFF' }]}>
                  Aprobar
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  btnApprove: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: BorderRadius.md,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
