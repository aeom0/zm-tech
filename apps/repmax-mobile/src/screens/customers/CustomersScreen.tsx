// ============================================================
// RepMAX Business Suite — Pantalla de Clientes
// Phone: lista → detalle · Tablet: master-detail
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal,
  Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { CustomerDetailPanel } from '../../components/customers/CustomerDetailPanel';
import { useCustomers } from '../../hooks/useCustomers';
import { useResponsive } from '../../hooks/useResponsive';
import { useTabBarOffset } from '../../hooks/useTabBarOffset';
import { customerService } from '../../services/customerService';
import { formatUSD } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Customer } from '../../types/database';
import type { CustomersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomersStackParamList, 'Customers'>;

function CustomerCard({
  customer,
  onPress,
  selected,
  showChevron,
}: {
  customer: Customer;
  onPress: () => void;
  selected?: boolean;
  showChevron?: boolean;
}) {
  const initials = customer.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.customerCard, selected && styles.customerCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.fullName}</Text>
        {customer.phone ? <Text style={styles.customerMeta}>{customer.phone}</Text> : null}
        {customer.cedulaRif ? <Text style={styles.customerMeta}>{customer.cedulaRif}</Text> : null}
      </View>
      <View style={styles.customerRight}>
        <Text style={styles.customerSpent}>{formatUSD(customer.totalSpentUsd)}</Text>
        <Text style={styles.customerPurchases}>{customer.totalPurchases} compras</Text>
        {showChevron ? (
          <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
        ) : null}
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

export default function CustomersScreen({ navigation, route }: Props) {
  const { isTabletUp } = useResponsive();
  const [query, setQuery] = useState('');
  const { customers, isLoading, error, refetch } = useCustomers(query || undefined);
  const { listPaddingWithFab } = useTabBarOffset();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<NewCustomerForm>({
    fullName: '', phone: '', cedulaRif: '', email: '', notes: '',
  });

  useEffect(() => {
    if (route.params?.openCreate) {
      setShowModal(true);
      navigation.setParams({ openCreate: undefined });
    }
  }, [route.params?.openCreate, navigation]);

  // Auto-seleccionar el primero en tablet cuando cambia la lista
  useEffect(() => {
    if (!isTabletUp || customers.length === 0) return;
    if (!selectedId || !customers.some((c) => c.id === selectedId)) {
      setSelectedId(customers[0].id);
    }
  }, [isTabletUp, customers, selectedId]);

  const selectedCustomer = customers.find((c) => c.id === selectedId) ?? null;

  const setField = (key: keyof NewCustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelect = (customer: Customer) => {
    if (isTabletUp) {
      setSelectedId(customer.id);
      return;
    }
    navigation.navigate('CustomerDetail', { customerId: customer.id });
  };

  const handleCreate = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Campo requerido', 'El nombre del cliente es obligatorio.');
      return;
    }
    setIsSaving(true);
    try {
      const created = await customerService.create({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        cedulaRif: form.cedulaRif.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setShowModal(false);
      setForm({ fullName: '', phone: '', cedulaRif: '', email: '', notes: '' });
      await refetch();
      if (isTabletUp && created?.id) {
        setSelectedId(created.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear el cliente.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const listPane = (
    <View style={isTabletUp ? styles.masterPane : styles.container}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por nombre, teléfono, cédula..."
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              selected={isTabletUp && item.id === selectedId}
              showChevron={!isTabletUp}
              onPress={() => handleSelect(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingWithFab }]}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No hay clientes registrados"
              subtitle="Toca + para agregar el primero"
            />
          }
        />
      )}

      <FAB
        icon="person-add"
        accessibilityLabel="Nuevo cliente"
        onPress={() => setShowModal(true)}
      />
    </View>
  );

  const createModal = (
    <Modal visible={showModal} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo cliente</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} accessibilityLabel="Cerrar">
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
                  onChangeText={(v) => setField(key, v)}
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
  );

  if (isTabletUp) {
    return (
      <View style={styles.splitRoot}>
        {listPane}
        <View style={styles.splitDivider} />
        <View style={styles.detailPane}>
          {selectedId ? (
            <CustomerDetailPanel customerId={selectedId} customer={selectedCustomer} />
          ) : (
            <EmptyState
              icon="people-outline"
              title="Selecciona un cliente"
              subtitle="El detalle aparece aquí"
            />
          )}
        </View>
        {createModal}
      </View>
    );
  }

  return (
    <>
      {listPane}
      {createModal}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  splitRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg.primary,
  },
  masterPane: {
    flex: 1,
    minWidth: 280,
    maxWidth: 420,
    backgroundColor: colors.bg.primary,
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.bg.border,
  },
  detailPane: {
    flex: 1.4,
    backgroundColor: colors.bg.primary,
  },
  list: { padding: spacing.md },
  customerCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
    ...shadows.sm,
  },
  customerCardSelected: {
    borderColor: colors.brand.orange,
    backgroundColor: colors.brand.orange + '12',
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
  customerInfo: { flex: 1, minWidth: 0 },
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
  errorText: { color: colors.semantic.error, textAlign: 'center', marginTop: spacing.xl },
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
