// ============================================================
// RepMAX Business Suite — Pantalla de Tasa de Cambio USD/Bs
// Actualizar la tasa con calculadora en vivo.
// Solo el owner puede guardar cambios.
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MoreStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useTasaCambio } from '../../hooks/useTasaCambio';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';

const NIVEL_SPREAD_LABEL: Record<string, string> = {
  bajo: 'Spread bajo',
  medio: 'Spread medio',
  alto: 'Spread alto',
  critico: 'Spread crítico',
};

type Props = NativeStackScreenProps<MoreStackParamList, 'ExchangeRate'>;

// Montos de ejemplo para la calculadora en vivo
const EJEMPLOS_USD = [10, 50, 100];

// Formatea un número como moneda sin símbolo, con separador de miles
function formatBs(amount: number): string {
  return amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExchangeRateScreen({ navigation }: Props) {
  const { storeUser, store, updateStore } = useAuth();

  const [inputRate, setInputRate] = useState(String(store?.usdBsRate ?? ''));
  const [isSaving, setIsSaving]   = useState(false);
  const [isTogglingManual, setIsTogglingManual] = useState(false);

  const isOwner = storeUser?.role === 'owner';
  const usarTasaManual = store?.usarTasaManual ?? true;
  const { tasas, isLoading: isLoadingTasas } = useTasaCambio(
    store?.usdBsRate ?? 0,
    usarTasaManual,
  );

  const handleToggleManual = async (value: boolean) => {
    setIsTogglingManual(true);
    try {
      await updateStore({ usarTasaManual: value });
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el modo de tasa.');
    } finally {
      setIsTogglingManual(false);
    }
  };

  // Parseo y validaciones
  const parsedRate = parseFloat(inputRate.replace(',', '.'));
  const isValid    = !isNaN(parsedRate) && parsedRate > 0;
  const isChanged  = isValid && parsedRate !== store?.usdBsRate;
  const canSave    = isValid && isChanged && isOwner;

  // Determina el color del borde del input según el estado
  const inputBorderColor = inputRate.length === 0
    ? colors.bg.border
    : isValid
      ? isChanged ? colors.brand.orange : colors.bg.border
      : colors.semantic.error;

  // Formatea la fecha de la última actualización
  const lastUpdated = store?.updatedAt
    ? new Date(store.updatedAt).toLocaleString('es-VE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const handleUpdate = () => {
    Alert.alert(
      'Confirmar tasa',
      `¿Actualizar a ${parsedRate.toFixed(2)} Bs por USD?\nEsta tasa se usará en las próximas ventas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async () => {
            setIsSaving(true);
            try {
              await updateStore({ usdBsRate: parsedRate });
              Alert.alert('✓ Actualizado', `Nueva tasa: ${parsedRate.toFixed(2)} Bs/USD`);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'No se pudo actualizar la tasa.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner para no-owner */}
        {!isOwner && (
          <View style={styles.warnBanner}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.semantic.warning} />
            <Text style={styles.warnText}>Solo el dueño puede cambiar la tasa.</Text>
          </View>
        )}

        {/* Bloque: tasa actual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasa Actual</Text>
          <View style={styles.rateCard}>
            <Text style={styles.rateLabel}>1 USD =</Text>
            <Text style={styles.rateValue}>
              {store?.usdBsRate?.toFixed(2) ?? '—'}
            </Text>
            <Text style={styles.rateCurrency}>Bs</Text>
            <Text style={styles.rateDate}>Actualizada: {lastUpdated}</Text>
          </View>
        </View>

        {/* Bloque: modo de tasa (manual vs BCV en vivo) */}
        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Modo de Tasa</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>Usar tasa manual</Text>
                  <Text style={styles.toggleSubtitle}>
                    {usarTasaManual
                      ? 'El checkout usa la tasa fijada abajo, no la tasa BCV en vivo.'
                      : 'El checkout usa la tasa BCV en vivo (fallback a la manual si falla).'}
                  </Text>
                </View>
                {isTogglingManual ? (
                  <ActivityIndicator color={colors.brand.orange} />
                ) : (
                  <Switch
                    value={usarTasaManual}
                    onValueChange={handleToggleManual}
                    trackColor={{ false: colors.bg.border, true: colors.brand.orange }}
                  />
                )}
              </View>
            </View>
          </View>
        )}

        {/* Bloque: input nueva tasa */}
        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nueva Tasa (Bs por 1 USD)</Text>
            <View style={styles.card}>
              <View style={[styles.inputRow, { borderColor: inputBorderColor }]}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.brand.steel} />
                <TextInput
                  style={styles.rateInput}
                  value={inputRate}
                  onChangeText={setInputRate}
                  placeholder={String(store?.usdBsRate ?? '38.50')}
                  placeholderTextColor={colors.text.disabled}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.inputSuffix}>Bs</Text>
              </View>

              {/* Mensaje de error si el input es inválido */}
              {inputRate.length > 0 && !isValid && (
                <Text style={styles.errorText}>
                  Ingresa un número positivo válido (ej: 38.50)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Bloque: calculadora en vivo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isOwner ? 'Vista Previa con Nueva Tasa' : 'Equivalencias Actuales'}
          </Text>
          <View style={styles.card}>
            {EJEMPLOS_USD.map((usd, index) => {
              const rateToUse  = isOwner && isValid ? parsedRate : (store?.usdBsRate ?? 0);
              const resultBs   = rateToUse > 0 ? usd * rateToUse : null;

              return (
                <View
                  key={usd}
                  style={[styles.calcRow, index < EJEMPLOS_USD.length - 1 && styles.calcRowBorder]}
                >
                  <Text style={styles.calcUsd}>${usd.toFixed(2)}</Text>
                  <View style={styles.calcArrow}>
                    <Ionicons name="arrow-forward" size={14} color={colors.text.disabled} />
                  </View>
                  <Text style={[styles.calcBs, !resultBs && styles.calcBsEmpty]}>
                    {resultBs ? `${formatBs(resultBs)} Bs` : '---'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bloque: BCV vs USDT en vivo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BCV vs USDT (en vivo)</Text>
          <View style={styles.card}>
            {isLoadingTasas && !tasas ? (
              <ActivityIndicator color={colors.brand.orange} />
            ) : tasas ? (
              <>
                <View style={[styles.calcRow, styles.calcRowBorder]}>
                  <Text style={styles.calcUsd}>BCV</Text>
                  <Text style={styles.calcBs}>
                    {tasas.bcv.disponible ? `${formatBs(tasas.bcv.valor)} Bs` : '---'}
                  </Text>
                </View>
                <View style={[styles.calcRow, styles.calcRowBorder]}>
                  <Text style={styles.calcUsd}>USDT</Text>
                  <Text style={styles.calcBs}>
                    {tasas.usdt.disponible ? `${formatBs(tasas.usdt.valor)} Bs` : '---'}
                  </Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcUsd}>
                    {NIVEL_SPREAD_LABEL[tasas.spread.nivel] ?? 'Spread'}
                  </Text>
                  <Text style={styles.calcBs}>{tasas.spread.porcentaje.toFixed(1)}%</Text>
                </View>
              </>
            ) : (
              <Text style={styles.refText}>
                No hay tasa BCV registrada todavía. Usa la tasa manual mientras tanto.
              </Text>
            )}
          </View>
        </View>

        {/* Botón actualizar — solo owner */}
        {isOwner && (
          <TouchableOpacity
            style={[styles.updateBtn, !canSave && styles.updateBtnDisabled]}
            onPress={handleUpdate}
            disabled={!canSave || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
                <Text style={styles.updateBtnText}>Actualizar Tasa</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'] * 2,
  },

  // Banner advertencia
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.warning + '18',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.semantic.warning + '40',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  warnText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.semantic.warning,
  },

  // Secciones
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: spacing.md,
    overflow: 'hidden',
  },

  // Tasa actual
  rateCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  rateValue: {
    fontSize: typography.size['4xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.brand.orange,
    lineHeight: typography.size['4xl'] * 1.1,
  },
  rateCurrency: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    marginTop: 2,
  },
  rateDate: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.disabled,
    marginTop: spacing.sm,
  },

  // Toggle modo de tasa
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
  },

  // Input nueva tasa
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
  },
  rateInput: {
    flex: 1,
    fontSize: typography.size['2xl'],
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  inputSuffix: {
    fontSize: typography.size.lg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },

  // Calculadora
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  calcRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.bg.border,
  },
  calcUsd: {
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    width: 72,
  },
  calcArrow: {
    width: 32,
    alignItems: 'center',
  },
  calcBs: {
    flex: 1,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    textAlign: 'right',
  },
  calcBsEmpty: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
  },

  // Referencias
  refText: {
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  // Botón actualizar
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    marginTop: spacing.sm,
  },
  updateBtnDisabled: {
    opacity: 0.4,
  },
  updateBtnText: {
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.inverse,
  },
});
