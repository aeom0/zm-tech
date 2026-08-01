// ============================================================
// RepMAX Business Suite — Dashboard con KPIs del día
// ============================================================
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useDashboard } from '../../hooks/useDashboard';
import { useAuth } from '../../context/AuthContext';
import { formatUSD } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';

interface KPICardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
}

function KPICard({ icon, iconColor, label, value, sub }: KPICardProps) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const { store, storeUser, logout } = useAuth();
  const { kpis, isLoading, error } = useDashboard();

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} tintColor={colors.brand.orange} />
      }
    >
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.storeName}>{store?.name ?? '—'}</Text>
          <Text style={styles.role}>{storeUser?.role === 'owner' ? 'Propietario' : storeUser?.role ?? ''}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Tasa del día */}
      {store && (
        <View style={styles.rateBanner}>
          <Ionicons name="trending-up-outline" size={16} color={colors.brand.orange} />
          <Text style={styles.rateText}>
            Tasa: <Text style={styles.rateValue}>1 USD = Bs. {store.usdBsRate}</Text>
          </Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* KPIs del día */}
      <Text style={styles.sectionTitle}>Resumen de hoy</Text>
      <View style={styles.kpiGrid}>
        <KPICard
          icon="cash-outline"
          iconColor={colors.semantic.success}
          label="Ventas hoy"
          value={formatUSD(kpis?.revenueToday ?? 0)}
          sub={`${kpis?.salesToday ?? 0} transacciones`}
        />
        <KPICard
          icon="receipt-outline"
          iconColor={colors.brand.orange}
          label="Transacciones"
          value={String(kpis?.salesToday ?? 0)}
        />
        <KPICard
          icon="cube-outline"
          iconColor={colors.semantic.info}
          label="Productos"
          value={String(kpis?.totalProducts ?? 0)}
        />
        <KPICard
          icon="people-outline"
          iconColor={colors.brand.steel}
          label="Clientes"
          value={String(kpis?.totalCustomers ?? 0)}
        />
      </View>

      {/* Accesos rápidos */}
      <Text style={styles.sectionTitle}>Acceso rápido</Text>
      <View style={styles.quickActions}>
        <QuickAction icon="cart" label="Nueva venta" color={colors.brand.orange} />
        <QuickAction icon="add-circle" label="Agregar producto" color={colors.semantic.success} />
        <QuickAction icon="person-add" label="Nuevo cliente" color={colors.semantic.info} />
        <QuickAction icon="wallet" label="Abrir caja" color={colors.semantic.warning} />
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.quickBtn}>
      <View style={[styles.quickIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    padding: spacing.base,
    paddingTop: spacing.xl + spacing.md, // espacio para status bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
  },
  storeName: {
    fontSize: typography.size.xl,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
    marginTop: 2,
  },
  role: {
    fontSize: typography.size.sm,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.medium,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  rateText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
  },
  rateValue: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semibold,
  },
  errorBanner: {
    backgroundColor: colors.semantic.error + '22',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: typography.size.sm,
  },
  sectionTitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.semibold,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '47.5%',
    ...shadows.sm,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    marginTop: 2,
  },
  kpiSub: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickBtn: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: '47.5%',
    ...shadows.sm,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
});
