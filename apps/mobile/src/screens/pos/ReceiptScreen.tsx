// ============================================================
// RepMAX Business Suite — Pantalla de Comprobante / Recibo
// Muestra el resumen de la venta completada.
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { saleService } from '../../services/saleService';
import { formatUSD, formatBS, formatDateTime } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Sale } from '../../types/database';
import type { POSStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<POSStackParamList, 'Receipt'>;

export default function ReceiptScreen({ route, navigation }: Props) {
  const { saleId } = route.params;
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carga el detalle de la venta desde la API
    const load = async () => {
      try {
        const allSales = await saleService.getAll();
        const found = allSales.find(s => s.id === saleId);
        if (found) setSale(found);
      } catch {
        // Si falla, mostrar solo el ID
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [saleId]);

  const paymentLabel = sale
    ? PAYMENT_METHODS.find(m => m.value === sale.paymentMethod)?.label ?? sale.paymentMethod
    : '';

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Icono de éxito */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={72} color={colors.semantic.success} />
        </View>
        <Text style={styles.successTitle}>¡Venta registrada!</Text>
        <Text style={styles.successSubtitle}>Comprobante de venta</Text>

        {/* Card del recibo */}
        <View style={styles.receiptCard}>
          <ReceiptRow label="Fecha" value={sale ? formatDateTime(sale.createdAt) : '—'} />
          <ReceiptRow label="N° venta" value={sale?.id?.slice(0, 8).toUpperCase() ?? saleId.slice(0, 8).toUpperCase()} />
          <Divider />
          <ReceiptRow label="Total USD" value={formatUSD(sale?.totalUsd ?? 0)} highlight />
          {sale?.totalBs && (
            <ReceiptRow label="Total Bs." value={formatBS(sale.totalBs)} />
          )}
          {sale?.usdBsRate && (
            <ReceiptRow label="Tasa" value={`Bs. ${sale.usdBsRate} x USD`} />
          )}
          <Divider />
          <ReceiptRow label="Método de pago" value={paymentLabel} />
          {sale?.customer && (
            <ReceiptRow label="Cliente" value={sale.customer.fullName} />
          )}
          {sale?.notes && (
            <ReceiptRow label="Nota" value={sale.notes} />
          )}
        </View>

        {/* Estado */}
        <View style={styles.statusBadge}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.semantic.success} />
          <Text style={styles.statusText}>COMPLETADA</Text>
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.newSaleBtn}
          onPress={() => navigation.navigate('POS')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.newSaleBtnText}>Nueva venta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReceiptRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={[styles.receiptValue, highlight && styles.receiptValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    padding: spacing.base,
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  successIcon: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.size['2xl'],
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  receiptCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    ...shadows.md,
    marginBottom: spacing.md,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  receiptLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    flex: 1,
  },
  receiptValue: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'right',
    flex: 1,
  },
  receiptValueHighlight: {
    fontSize: typography.size.lg,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.bg.border,
    marginVertical: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.semantic.success + '22',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    color: colors.semantic.success,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    letterSpacing: 1,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    backgroundColor: colors.bg.secondary,
  },
  newSaleBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  newSaleBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
});
