// ============================================================
// Detalle de cliente (pantalla stack + panel master-detail)
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { customerService } from '../../services/customerService';
import { formatUSD, formatDate } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Customer } from '../../types/database';

interface CustomerDetailPanelProps {
  customerId: string;
  /** Cliente ya cargado (evita fetch extra en master-detail) */
  customer?: Customer | null;
}

export function CustomerDetailPanel({ customerId, customer: customerProp }: CustomerDetailPanelProps) {
  const [customer, setCustomer] = useState<Customer | null>(customerProp ?? null);
  const [isLoading, setIsLoading] = useState(!customerProp);

  useEffect(() => {
    if (customerProp) {
      setCustomer(customerProp);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const all = await customerService.getAll();
        const found = all.find((c) => c.id === customerId) ?? null;
        if (!cancelled) setCustomer(found);
      } catch {
        if (!cancelled) setCustomer(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [customerId, customerProp]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={48} color={colors.text.disabled} />
        <Text style={styles.emptyText}>Cliente no encontrado</Text>
      </View>
    );
  }

  const initials = customer.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{customer.fullName}</Text>
        <Text style={styles.since}>Cliente desde {formatDate(customer.createdAt)}</Text>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{customer.totalPurchases}</Text>
          <Text style={styles.kpiLabel}>Compras</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.brand.orange }]}>
            {formatUSD(customer.totalSpentUsd)}
          </Text>
          <Text style={styles.kpiLabel}>Total gastado</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de contacto</Text>
        <InfoRow icon="call-outline" label="Teléfono" value={customer.phone ?? '—'} />
        <InfoRow icon="card-outline" label="Cédula / RIF" value={customer.cedulaRif ?? '—'} />
        <InfoRow icon="mail-outline" label="Email" value={customer.email ?? '—'} />
      </View>

      {customer.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.notes}>{customer.notes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.text.secondary} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.orange + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size['2xl'],
  },
  name: {
    fontSize: typography.size.xl,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  since: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
    ...shadows.sm,
  },
  kpiValue: {
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
  },
  kpiLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bg.border,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
  },
  infoValue: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.medium,
    marginTop: 2,
  },
  notes: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 22,
  },
});
