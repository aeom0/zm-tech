// ============================================================
// RepMAX Business Suite — Pantalla de Sesión de Caja
// Abrir/cerrar caja, ver ventas de la sesión actual.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput, Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { saleService } from '../../services/saleService';
import { formatUSD, formatBS, formatDateTime } from '../../utils/formatters';
import { PAYMENT_METHODS } from '../../constants/paymentMethods';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import { useAuth } from '../../context/AuthContext';
import type { CashSession, Sale } from '../../types/database';

export default function CashSessionScreen() {
  const { store, storeUser } = useAuth();
  const [session, setSession] = useState<CashSession | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modales
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const activeSession = await saleService.getActiveSession();
      setSession(activeSession);

      if (activeSession) {
        const sessionSales = await saleService.getAll(activeSession.id);
        setSales(sessionSales);
      } else {
        setSales([]);
      }
    } catch {
      // Error silencioso
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenSession = async () => {
    setIsSubmitting(true);
    try {
      const newSession = await saleService.openSession(
        store!.id,
        storeUser!.id,
        parseFloat(openingAmount) || 0,
        sessionNotes || undefined
      );
      setSession(newSession);
      setShowOpenModal(false);
      setOpeningAmount('');
      setSessionNotes('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo abrir la caja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;
    Alert.alert(
      'Cerrar caja',
      '¿Confirmas el cierre de la sesión actual? No podrás agregar más ventas a esta sesión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar caja',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await saleService.closeSession(
                session.id,
                parseFloat(closingAmount) || 0,
                sessionNotes || undefined
              );
              setShowCloseModal(false);
              setClosingAmount('');
              setSessionNotes('');
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'No se pudo cerrar la caja.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Calcular totales por método de pago
  const totalBySales = sales.reduce((sum, s) => sum + Number(s.totalUsd), 0);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand.orange} />}
      >
        {/* Estado de la caja */}
        <View style={[styles.statusCard, session ? styles.statusOpen : styles.statusClosed]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusDot, { backgroundColor: session ? colors.semantic.success : colors.text.disabled }]} />
            <Text style={styles.statusLabel}>{session ? 'Caja abierta' : 'Caja cerrada'}</Text>
          </View>
          {session ? (
            <>
              <Text style={styles.sessionTime}>Abierta el {formatDateTime(session.openedAt)}</Text>
              <Text style={styles.sessionTotal}>{formatUSD(totalBySales)}</Text>
              <Text style={styles.sessionTotalLabel}>Total en ventas</Text>
              <Text style={styles.sessionCount}>{sales.length} venta{sales.length !== 1 ? 's' : ''}</Text>
            </>
          ) : (
            <Text style={styles.noSessionText}>No hay sesión activa. Abre la caja para comenzar a vender.</Text>
          )}
        </View>

        {/* Botones de acción */}
        {session ? (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setShowCloseModal(true)}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.text.inverse} />
            <Text style={styles.closeBtnText}>Cerrar caja</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => setShowOpenModal(true)}
          >
            <Ionicons name="lock-open-outline" size={20} color={colors.text.inverse} />
            <Text style={styles.openBtnText}>Abrir caja</Text>
          </TouchableOpacity>
        )}

        {/* Lista de ventas de la sesión */}
        {session && sales.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ventas de esta sesión</Text>
            {sales.map(sale => (
              <View key={sale.id} style={styles.saleRow}>
                <View style={styles.saleLeft}>
                  <Text style={styles.saleTime}>{formatDateTime(sale.createdAt)}</Text>
                  <Text style={styles.saleMethod}>
                    {PAYMENT_METHODS.find(m => m.value === sale.paymentMethod)?.label ?? sale.paymentMethod}
                  </Text>
                </View>
                <Text style={styles.saleAmount}>{formatUSD(sale.totalUsd)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal: Abrir caja */}
      <Modal visible={showOpenModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Abrir caja</Text>
              <TouchableOpacity onPress={() => setShowOpenModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Monto de apertura (USD)</Text>
            <TextInput
              style={styles.fieldInput}
              value={openingAmount}
              onChangeText={setOpeningAmount}
              placeholder="0.00"
              placeholderTextColor={colors.text.disabled}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Nota (opcional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="Turno de la mañana..."
              placeholderTextColor={colors.text.disabled}
            />
            <TouchableOpacity
              style={[styles.openBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleOpenSession}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.openBtnText}>Confirmar apertura</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Cerrar caja */}
      <Modal visible={showCloseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cerrar caja</Text>
              <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.closingSummary}>
              <Text style={styles.closingLabel}>Total en ventas</Text>
              <Text style={styles.closingTotal}>{formatUSD(totalBySales)}</Text>
            </View>
            <Text style={styles.fieldLabel}>Monto de cierre en caja (USD)</Text>
            <TextInput
              style={styles.fieldInput}
              value={closingAmount}
              onChangeText={setClosingAmount}
              placeholder="0.00"
              placeholderTextColor={colors.text.disabled}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Nota de cierre (opcional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="Todo correcto..."
              placeholderTextColor={colors.text.disabled}
            />
            <TouchableOpacity
              style={[styles.closeBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleCloseSession}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.closeBtnText}>Confirmar cierre</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.base, paddingBottom: spacing.xl },
  statusCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
  },
  statusOpen: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.semantic.success + '44',
  },
  statusClosed: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.bg.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionTime: {
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    marginBottom: spacing.md,
  },
  sessionTotal: {
    fontSize: typography.size['3xl'],
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  sessionTotalLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 4,
  },
  sessionCount: {
    fontSize: typography.size.sm,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    marginTop: spacing.xs,
  },
  noSessionText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 22,
  },
  openBtn: {
    backgroundColor: colors.semantic.success,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  openBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
  closeBtn: {
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  closeBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  saleLeft: { flex: 1 },
  saleTime: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
  },
  saleMethod: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  saleAmount: {
    fontSize: typography.size.md,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
  },
  closingSummary: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  closingLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  closingTotal: {
    fontSize: typography.size['2xl'],
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    marginTop: spacing.xs,
  },
  fieldLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  fieldInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
});
