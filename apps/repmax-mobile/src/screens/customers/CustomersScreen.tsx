// ============================================================
// RepMAX Business Suite — Pantalla de Clientes
// Lista de clientes con búsqueda y opción de crear nuevos.
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Modal,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useCustomers } from '../../hooks/useCustomers';
import { customerService } from '../../services/customerService';
import { formatUSD, formatDate } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Customer } from '../../types/database';
import type { CustomersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomersStackParamList, 'Customers'>;

function CustomerCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const initials = customer.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <TouchableOpacity style={styles.customerCard} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.fullName}</Text>
        {customer.phone && (
          <Text style={styles.customerMeta}>{customer.phone}</Text>
        )}
        {customer.cedulaRif && (
          <Text style={styles.customerMeta}>{customer.cedulaRif}</Text>
        )}
      </View>
      <View style={styles.customerRight}>
        <Text style={styles.customerSpent}>{formatUSD(customer.totalSpentUsd)}</Text>
        <Text style={styles.customerPurchases}>{customer.totalPurchases} compras</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
      </View>
    </TouchableOpacity>
  );
}

interface NewCustomerForm {
  fullName: string;
  phone: string;
  cedulaRif: string;
  email: string;
  notes: string;
}

export default function CustomersScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const { customers, isLoading, error, refetch } = useCustomers(query || undefined);

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<NewCustomerForm>({
    fullName: '', phone: '', cedulaRif: '', email: '', notes: '',
  });

  const setField = (key: keyof NewCustomerForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del cliente es obligatorio.');
      return;
    }
    setIsSaving(true);
    try {
      await customerService.create({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        cedulaRif: form.cedulaRif.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setShowModal(false);
      setForm({ fullName: '', phone: '', cedulaRif: '', email: '', notes: '' });
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No se pudo crear el cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Búsqueda */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.text.secondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, teléfono, cédula..."
          placeholderTextColor={colors.text.disabled}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.text.disabled} />
              <Text style={styles.emptyText}>No hay clientes registrados</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
        <Ionicons name="person-add" size={24} color={colors.text.inverse} />
      </TouchableOpacity>

      {/* Modal nuevo cliente */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo cliente</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {([
                { key: 'fullName', label: 'Nombre completo *', placeholder: 'Juan Pérez' },
                { key: 'phone', label: 'Teléfono', placeholder: '0424-1234567' },
                { key: 'cedulaRif', label: 'Cédula / RIF', placeholder: 'V-12345678' },
                { key: 'email', label: 'Email', placeholder: 'cliente@email.com' },
                { key: 'notes', label: 'Notas', placeholder: 'Mecánico de confianza...' },
              ] as const).map(({ key, label, placeholder }) => (
                <View key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={form[key]}
                    onChangeText={v => setField(key, v)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.disabled}
                    keyboardType={key === 'email' ? 'email-address' : 'default'}
                    autoCapitalize={key === 'email' ? 'none' : 'words'}
                    autoCorrect={false}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.createBtn, isSaving && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.createBtnText}>Crear cliente</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  list: { padding: spacing.md, paddingBottom: 100 },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.orange + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semibold,
  },
  customerMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  customerRight: { alignItems: 'flex-end', gap: 2 },
  customerSpent: {
    fontSize: typography.size.md,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  customerPurchases: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
  },
  emptyState: { alignItems: 'center', paddingTop: spacing['3xl'], gap: spacing.md },
  emptyText: { color: colors.text.disabled, fontFamily: typography.fontFamily.regular, fontSize: typography.size.base },
  errorText: { color: colors.semantic.error, textAlign: 'center', marginTop: spacing.xl },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.base,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.full,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
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
    maxHeight: '85%',
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
  createBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
});
