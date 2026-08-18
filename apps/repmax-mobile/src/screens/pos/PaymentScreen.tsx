// ============================================================
// RepMAX Business Suite — Pantalla de Cobro / Pago
// Selecciona método de pago, cliente opcional, registra la venta.
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useTasaCambio } from '../../hooks/useTasaCambio';
import {
  convertirUsdABs,
  validarDetallesPagoMixto,
  type DetallesPago,
  type MonedaPago,
} from '@zmtech/tasas';
import { saleService } from '../../services/saleService';
import { mlListingService } from '../../services/mercadolibre/mlListingService';
import { formatUSD, formatBS } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { PaymentMethod } from '../../types/database';
import type { POSStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<POSStackParamList, 'Payment'>;

export default function PaymentScreen({ navigation }: Props) {
  const { items, totalUsd, clearCart } = useCart();
  const { store, storeUser } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH_USD');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [montoMixtoUsd, setMontoMixtoUsd] = useState('');
  const [montoMixtoBs, setMontoMixtoBs] = useState('');

  // Sesión activa de caja
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    saleService.getActiveSession().then(session => {
      if (session) setSessionId(session.id);
    }).catch(() => {});
  }, []);

  const tasaManual = store?.usdBsRate ?? 36.5;
  // La migración deja el modo vivo como default; no degradar a manual si el
  // campo aún no llegó durante la carga de la tienda.
  const usarTasaManual = store?.usarTasaManual ?? false;
  const { usdBsRateEfectivo, isLoading: isLoadingTasa } = useTasaCambio(
    tasaManual,
    usarTasaManual,
  );
  const usdBsRate = usdBsRateEfectivo;
  const totalBs = convertirUsdABs(totalUsd, usdBsRate);
  const esMetodoBs = ['CASH_BS', 'PAGO_MOVIL', 'TRANSFERENCIA'].includes(selectedMethod);
  const detallesMixtos: DetallesPago = {
    CASH_USD: { monto: Number(montoMixtoUsd) || 0, moneda: 'USD' },
    CASH_BS: { monto: Number(montoMixtoBs) || 0, moneda: 'BS' },
  };
  const validacionMixta =
    selectedMethod === 'MIXED'
      ? validarDetallesPagoMixto(detallesMixtos, totalUsd, usdBsRate)
      : null;

  const crearDetallesPago = (): DetallesPago => {
    if (selectedMethod === 'MIXED') return detallesMixtos;
    const moneda: MonedaPago = esMetodoBs ? 'BS' : 'USD';
    return {
      [selectedMethod]: {
        monto: moneda === 'BS' ? totalBs : totalUsd,
        moneda,
      },
    };
  };

  const handleConfirm = async () => {
    if (!storeUser) {
      Alert.alert('Error', 'No se encontró el usuario de la tienda.');
      return;
    }
    if (!usarTasaManual && isLoadingTasa) {
      Alert.alert('Tasa en actualización', 'Espera un momento mientras se consulta la tasa BCV.');
      return;
    }
    if (validacionMixta && !validacionMixta.valido) {
      Alert.alert('Montos mixtos incompletos', validacionMixta.mensaje);
      return;
    }

    Alert.alert(
      'Confirmar venta',
      `Total: ${formatUSD(totalUsd)}\nMétodo: ${PAYMENT_METHODS.find(m => m.value === selectedMethod)?.label}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsLoading(true);
            try {
              const productIds = [...new Set(items.map((i) => i.product.id))];
              const saleId = await saleService.create({
                storeId: store!.id,
                cashierId: storeUser.id,
                sessionId,
                paymentMethod: selectedMethod,
                paymentDetails: crearDetallesPago(),
                usdBsRate,
                notes: notes.trim() || undefined,
                items,
              });
              const mlAlertItems = await mlListingService.findPublishedOnMlForSale(productIds);
              if (mlAlertItems.length > 0) {
                await mlListingService.markNeedsUpdateAfterSale(
                  mlAlertItems.map((i) => i.productId),
                );
              }
              clearCart();
              setMontoMixtoUsd('');
              setMontoMixtoBs('');
              navigation.replace('Receipt', { saleId, mlStockAlert: mlAlertItems });
            } catch (err: any) {
              const msg = err?.response?.data?.message || 'Error al registrar la venta.';
              Alert.alert('Error', msg);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Resumen del total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total a cobrar</Text>
          <Text style={styles.totalUsd}>{formatUSD(totalUsd)}</Text>
          <Text style={styles.totalBs}>{formatBS(totalBs)}</Text>
          <Text style={styles.rateHint}>@ Bs. {usdBsRate} x USD</Text>
        </View>

        {/* Método de pago */}
        <Text style={styles.sectionTitle}>Método de pago</Text>
        <View style={styles.methodsGrid}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodBtn,
                selectedMethod === method.value && styles.methodBtnActive,
              ]}
              onPress={() => setSelectedMethod(method.value)}
            >
              <Ionicons
                name={getMethodIcon(method.value)}
                size={20}
                color={selectedMethod === method.value ? colors.text.inverse : colors.text.secondary}
              />
              <Text style={[
                styles.methodBtnText,
                selectedMethod === method.value && styles.methodBtnTextActive,
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedMethod === 'MIXED' ? (
          <View style={styles.mixedCard}>
            <Text style={styles.mixedTitle}>Desglose del pago mixto</Text>
            <TextInput
              style={styles.mixedInput}
              value={montoMixtoUsd}
              onChangeText={setMontoMixtoUsd}
              placeholder="Monto en USD"
              placeholderTextColor={colors.text.disabled}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.mixedInput}
              value={montoMixtoBs}
              onChangeText={setMontoMixtoBs}
              placeholder="Monto en Bs"
              placeholderTextColor={colors.text.disabled}
              keyboardType="decimal-pad"
            />
            <Text style={[
              styles.mixedValidation,
              validacionMixta?.valido ? styles.mixedValid : styles.mixedInvalid,
            ]}>
              {validacionMixta?.valido
                ? 'El desglose coincide con el total.'
                : validacionMixta?.mensaje}
            </Text>
          </View>
        ) : (
          <View style={styles.paymentAmountCard}>
            <Text style={styles.paymentAmountLabel}>Monto a cobrar</Text>
            <Text style={styles.paymentAmountValue}>
              {esMetodoBs ? formatBS(totalBs) : formatUSD(totalUsd)}
            </Text>
          </View>
        )}

        {/* Nota opcional */}
        <Text style={styles.sectionTitle}>Nota (opcional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Observaciones de la venta..."
          placeholderTextColor={colors.text.disabled}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Sin sesión de caja abierta — aviso */}
        {!sessionId && (
          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.semantic.warning} />
            <Text style={styles.warnText}>
              No hay sesión de caja abierta. La venta se registrará sin sesión.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Botón de confirmación */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (isLoading || (!usarTasaManual && isLoadingTasa)) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={isLoading || (!usarTasaManual && isLoadingTasa)}
        >
          {isLoading || (!usarTasaManual && isLoadingTasa) ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.text.inverse} />
              <Text style={styles.confirmBtnText}>Confirmar venta</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getMethodIcon(method: PaymentMethod): keyof typeof Ionicons.glyphMap {
  const icons: Partial<Record<PaymentMethod, keyof typeof Ionicons.glyphMap>> = {
    CASH_USD:      'cash-outline',
    CASH_BS:       'wallet-outline',
    ZELLE:         'phone-portrait-outline',
    PAGO_MOVIL:    'phone-portrait-outline',
    TRANSFERENCIA: 'swap-horizontal-outline',
    MIXED:         'layers-outline',
  };
  return icons[method] ?? 'card-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
  },
  totalCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.brand.orange + '44',
    ...shadows.md,
  },
  totalLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalUsd: {
    fontSize: typography.size['4xl'],
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    marginTop: spacing.xs,
  },
  totalBs: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    marginTop: spacing.xs,
  },
  rateHint: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  methodBtnActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  methodBtnText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  methodBtnTextActive: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.semibold,
  },
  notesInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  paymentAmountCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  paymentAmountLabel: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
  },
  paymentAmountValue: {
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    marginTop: spacing.xs,
  },
  mixedCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.orange + '66',
    gap: spacing.sm,
  },
  mixedTitle: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.base,
  },
  mixedInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mixedValidation: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
  },
  mixedValid: {
    color: colors.semantic.success,
  },
  mixedInvalid: {
    color: colors.semantic.warning,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.warning + '22',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  warnText: {
    flex: 1,
    color: colors.semantic.warning,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.bg.border,
    backgroundColor: colors.bg.secondary,
  },
  confirmBtn: {
    backgroundColor: colors.semantic.success,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
});
