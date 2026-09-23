import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useHeaderHeight } from '@react-navigation/elements'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Spacing, BorderRadius } from '@/constants/theme'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'

import { useProductSales } from './sales/hooks/useProductSales'
import type { PaymentMethod, ProductOrder, ProductOrderForm, SellableProduct } from './sales/types'

type Tab = 'catalog' | 'orders'

const EMPTY_FORM: ProductOrderForm = {
  productId: '',
  quantity: '1',
  clientName: '',
  clientPhone: '',
  notes: '',
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'yape_plin', label: 'Yape/Plin' },
  { id: 'transfer', label: 'Transferencia' },
  { id: 'card', label: 'Tarjeta' },
]

function productName(order: ProductOrder) {
  return Array.isArray(order.inventory_items)
    ? (order.inventory_items[0]?.name ?? 'Producto')
    : (order.inventory_items?.name ?? 'Producto')
}

function statusLabel(status: ProductOrder['status']) {
  return {
    reserved: 'Apartado',
    pedido: 'Pedido',
    paid: 'Pagado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }[status]
}

function formatMoney(value: number, symbol: string) {
  return `${symbol}${value.toFixed(2)}`
}

export default function ProductSalesScreen() {
  const { theme } = useTheme()
  const { config } = useTenant()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  const currencySymbol = config.locale.currency.symbol
  const [tab, setTab] = useState<Tab>('catalog')
  const [form, setForm] = useState<ProductOrderForm>(EMPTY_FORM)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<SellableProduct | null>(null)

  const { productsQuery, ordersQuery, createOrderMutation, payOrderMutation, updateOrderMutation } =
    useProductSales()
  const products = productsQuery.data ?? []
  const orders = ordersQuery.data ?? []
  const isLoading = productsQuery.isLoading || ordersQuery.isLoading

  const openOrderForm = (product: SellableProduct) => {
    setSelectedProduct(product)
    setForm({ ...EMPTY_FORM, productId: product.id })
    setModalVisible(true)
  }

  const closeOrderForm = () => {
    setModalVisible(false)
    setSelectedProduct(null)
  }

  const submitOrder = () => {
    if (!selectedProduct) return
    const quantity = Number.parseInt(form.quantity, 10)
    if (!Number.isInteger(quantity) || quantity < 1) {
      Alert.alert('Cantidad inválida', 'Ingresa una cantidad mayor a cero.')
      return
    }
    if (!selectedProduct.price || selectedProduct.price <= 0) {
      Alert.alert('Producto sin precio', 'Agrega un precio al producto antes de venderlo.')
      return
    }
    createOrderMutation.mutate(
      {
        inventory_item_id: selectedProduct.id,
        quantity,
        unit_price: selectedProduct.price,
        client_name: form.clientName.trim(),
        client_phone: form.clientPhone.trim() || null,
        notes: form.notes.trim() || null,
      },
      { onSuccess: closeOrderForm }
    )
  }

  const handlePay = (order: ProductOrder) => {
    Alert.alert(
      'Registrar pago',
      `${productName(order)} · ${formatMoney(order.unit_price * order.quantity, currencySymbol)}`,
      [
        ...PAYMENT_METHODS.map((method) => ({
          text: method.label,
          onPress: () => payOrderMutation.mutate({ orderId: order.id, method: method.id }),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    )
  }

  const orderCount = useMemo(
    () => orders.filter((order) => ['reserved', 'pedido', 'paid'].includes(order.status)).length,
    [orders]
  )

  if (productsQuery.isError || ordersQuery.isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText style={{ color: theme.error }}>No se pudieron cargar las ventas.</ThemedText>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.tabs, { paddingTop: headerHeight + Spacing.sm }]}>
        {[
          { id: 'catalog' as const, label: 'Catálogo' },
          { id: 'orders' as const, label: `Pedidos${orderCount ? ` (${orderCount})` : ''}` },
        ].map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            style={[
              styles.tab,
              {
                backgroundColor: tab === item.id ? theme.primary : theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={{ color: tab === item.id ? '#fff' : theme.text }}>
              {item.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void productsQuery.refetch()
              void ordersQuery.refetch()
            }}
          />
        }
      >
        {tab === 'catalog'
          ? products.map((product) => (
              <View
                key={product.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardInfo}>
                  <ThemedText style={styles.cardTitle}>{product.name}</ThemedText>
                  <ThemedText style={{ color: theme.textMuted }}>
                    {product.quantity} {product.unit} disponibles
                  </ThemedText>
                  <ThemedText style={[styles.price, { color: theme.primary }]}>
                    {product.price == null
                      ? 'Sin precio'
                      : formatMoney(product.price, currencySymbol)}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => openOrderForm(product)}
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                >
                  <Feather name="shopping-bag" size={16} color="#fff" />
                  <ThemedText style={styles.actionText}>Apartar</ThemedText>
                </Pressable>
              </View>
            ))
          : orders.map((order) => (
              <View
                key={order.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardInfo}>
                  <ThemedText style={styles.cardTitle}>{productName(order)}</ThemedText>
                  <ThemedText style={{ color: theme.textMuted }}>
                    {order.client_name || 'Clienta'} · {order.quantity} unidad(es)
                  </ThemedText>
                  <ThemedText style={{ color: theme.textMuted }}>
                    {formatMoney(order.unit_price * order.quantity, currencySymbol)} ·{' '}
                    {statusLabel(order.status)}
                  </ThemedText>
                </View>
                <View style={styles.orderActions}>
                  {(order.status === 'reserved' || order.status === 'pedido') && (
                    <>
                      <Pressable
                        onPress={() => handlePay(order)}
                        style={[styles.smallButton, { backgroundColor: theme.primary }]}
                      >
                        <ThemedText style={styles.actionText}>Cobrar</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert('Cancelar pedido', '¿Deseas cancelar este pedido?', [
                            { text: 'No', style: 'cancel' },
                            {
                              text: 'Cancelar',
                              style: 'destructive',
                              onPress: () =>
                                updateOrderMutation.mutate({
                                  orderId: order.id,
                                  status: 'cancelled',
                                }),
                            },
                          ])
                        }
                        style={[styles.smallButton, { borderColor: theme.border }]}
                      >
                        <ThemedText style={{ color: theme.text }}>Cancelar</ThemedText>
                      </Pressable>
                    </>
                  )}
                  {order.status === 'paid' && (
                    <Pressable
                      onPress={() =>
                        updateOrderMutation.mutate({ orderId: order.id, status: 'delivered' })
                      }
                      style={[styles.smallButton, { backgroundColor: theme.primary }]}
                    >
                      <ThemedText style={styles.actionText}>Entregar</ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
        {!isLoading && (tab === 'catalog' ? products.length === 0 : orders.length === 0) && (
          <View style={styles.empty}>
            <Feather
              name={tab === 'catalog' ? 'shopping-bag' : 'clipboard'}
              size={32}
              color={theme.textMuted}
            />
            <ThemedText style={{ color: theme.textMuted }}>
              {tab === 'catalog' ? 'No hay productos vendibles.' : 'No hay pedidos registrados.'}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.cardTitle}>Nuevo apartado</ThemedText>
              <Pressable onPress={closeOrderForm}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ThemedText style={{ color: theme.textMuted }}>{selectedProduct?.name}</ThemedText>
            {[
              {
                key: 'quantity',
                label: 'Cantidad',
                placeholder: '1',
                keyboardType: 'number-pad' as const,
              },
              {
                key: 'clientName',
                label: 'Nombre de la clienta',
                placeholder: 'Nombre',
                keyboardType: 'default' as const,
              },
              {
                key: 'clientPhone',
                label: 'Teléfono',
                placeholder: 'Opcional',
                keyboardType: 'phone-pad' as const,
              },
              {
                key: 'notes',
                label: 'Notas',
                placeholder: 'Opcional',
                keyboardType: 'default' as const,
              },
            ].map((field) => (
              <View key={field.key}>
                <ThemedText style={[styles.label, { color: theme.textMuted }]}>
                  {field.label}
                </ThemedText>
                <TextInput
                  value={form[field.key as keyof ProductOrderForm]}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, [field.key]: value }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.textMuted}
                  keyboardType={field.keyboardType}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                />
              </View>
            ))}
            <Pressable
              onPress={submitOrder}
              disabled={createOrderMutation.isPending}
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
            >
              {createOrderMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.actionText}>Guardar apartado</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '700', marginTop: Spacing.xs },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  actionText: { color: '#fff', fontWeight: '700' },
  smallButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  orderActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing['5xl'] },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  modal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  input: {
    minHeight: 46,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
})
