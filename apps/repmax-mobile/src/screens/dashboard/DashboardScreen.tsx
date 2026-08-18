// ============================================================
// RepMAX Business Suite — Dashboard con KPIs del día
// ============================================================
import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Screen } from '../../components/layout/Screen';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuth } from '../../context/AuthContext';
import { useTasaCambio } from '../../hooks/useTasaCambio';
import { useResponsive } from '../../hooks/useResponsive';
import { formatUSD } from '../../utils/formatters';
import { hapticLight } from '../../utils/haptics';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { MainTabParamList } from '../../navigation/types';

interface KPICardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  onPress?: () => void;
  width: `${number}%` | number;
}

function KPICard({ icon, iconColor, label, value, sub, onPress, width }: KPICardProps) {
  return (
    <TouchableOpacity
      style={[styles.kpiCard, { width }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={[styles.kpiIcon, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { store, storeUser, logout } = useAuth();
  const { kpis, isLoading, error } = useDashboard();
  const { usdBsRateEfectivo } = useTasaCambio(
    store?.usdBsRate ?? 36.5,
    store?.usarTasaManual ?? false,
  );
  const { isTabletUp } = useResponsive();
  const tileWidth = isTabletUp ? '23.5%' : '47.5%';

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';

  const ticketPromedio = useMemo(() => {
    const ventas = kpis?.salesToday ?? 0;
    const revenue = kpis?.revenueToday ?? 0;
    return ventas > 0 ? revenue / ventas : 0;
  }, [kpis?.salesToday, kpis?.revenueToday]);

  const go = (fn: () => void) => {
    void hapticLight();
    fn();
  };

  return (
    <Screen edges={['top']} padded={false} constrainWidth={!isTabletUp}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          isTabletUp && styles.contentTablet,
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} tintColor={colors.brand.orange} />
        }
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.storeName}>{store?.name ?? '—'}</Text>
            <Text style={styles.role}>{storeUser?.role === 'owner' ? 'Propietario' : storeUser?.role ?? ''}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn} accessibilityLabel="Cerrar sesión">
            <Ionicons name="log-out-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Tasa del día → Tasa de cambio */}
        {store && (
          <TouchableOpacity
            style={styles.rateBanner}
            onPress={() => go(() => navigation.navigate('MoreTab', { screen: 'ExchangeRate' }))}
            activeOpacity={0.8}
          >
            <Ionicons name="trending-up-outline" size={16} color={colors.brand.orange} />
            <Text style={styles.rateText}>
              Tasa: <Text style={styles.rateValue}>1 USD = Bs. {usdBsRateEfectivo.toFixed(2)}</Text>
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Resumen de hoy</Text>
        <View style={styles.kpiGrid}>
          <KPICard
            width={tileWidth}
            icon="cash-outline"
            iconColor={colors.semantic.success}
            label="Ventas hoy"
            value={formatUSD(kpis?.revenueToday ?? 0)}
            sub={`${kpis?.salesToday ?? 0} transacciones`}
            onPress={() => go(() => navigation.navigate('POSTab', { screen: 'POS' }))}
          />
          <KPICard
            width={tileWidth}
            icon="pricetag-outline"
            iconColor={colors.brand.orange}
            label="Ticket prom."
            value={formatUSD(ticketPromedio)}
          />
          <KPICard
            width={tileWidth}
            icon="cube-outline"
            iconColor={colors.semantic.info}
            label="Productos"
            value={String(kpis?.totalProducts ?? 0)}
            onPress={() => go(() => navigation.navigate('InventoryTab', { screen: 'Inventory' }))}
          />
          <KPICard
            width={tileWidth}
            icon="people-outline"
            iconColor={colors.brand.steel}
            label="Clientes"
            value={String(kpis?.totalCustomers ?? 0)}
            onPress={() => go(() => navigation.navigate('CustomersTab', { screen: 'Customers' }))}
          />
        </View>

        <Text style={styles.sectionTitle}>Acceso rápido</Text>
        <View style={styles.quickActions}>
          <QuickAction
            width={tileWidth}
            icon="cart"
            label="Nueva venta"
            color={colors.brand.orange}
            onPress={() => go(() => navigation.navigate('POSTab', { screen: 'POS' }))}
          />
          <QuickAction
            width={tileWidth}
            icon="add-circle"
            label="Agregar producto"
            color={colors.semantic.success}
            onPress={() => go(() =>
              navigation.navigate('InventoryTab', { screen: 'ProductForm', params: {} })
            )}
          />
          <QuickAction
            width={tileWidth}
            icon="person-add"
            label="Nuevo cliente"
            color={colors.semantic.info}
            onPress={() => go(() =>
              navigation.navigate('CustomersTab', {
                screen: 'Customers',
                params: { openCreate: true },
              })
            )}
          />
          <QuickAction
            width={tileWidth}
            icon="wallet"
            label="Abrir caja"
            color={colors.semantic.warning}
            onPress={() => go(() =>
              navigation.navigate('MoreTab', { screen: 'CashSession' })
            )}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  width,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  width: `${number}%` | number;
}) {
  return (
    <TouchableOpacity style={[styles.quickBtn, { width }]} onPress={onPress} activeOpacity={0.8}>
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
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
  },
  contentTablet: {
    paddingHorizontal: spacing.xl,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
  },
  rateText: {
    flex: 1,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
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
