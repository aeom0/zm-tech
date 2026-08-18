// ============================================================
// Panel de carrito reutilizable (pantalla Cart + sidebar tablet)
// ============================================================
import React from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { EmptyState } from '../ui/EmptyState'
import { ProductThumb } from '../inventory/ProductThumb'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useTasaCambio } from '../../hooks/useTasaCambio'
import { formatBS, formatUSD } from '../../utils/formatters'
import { uriPortada } from '../../utils/productPhotos'
import { hapticLight } from '../../utils/haptics'
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme'
import type { CartItem } from '../../types/database'

interface CartPanelProps {
  onCheckout: () => void
  /** Embebido en sidebar (sin CTA de volver al catálogo) */
  embedded?: boolean
  onBrowseProducts?: () => void
}

function CartItemRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}) {
  return (
    <View style={styles.itemRow}>
      <ProductThumb
        uri={uriPortada(item.product.photos)}
        size="sm"
        accessibilityLabel={item.product.title}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.product.title}
        </Text>
        <Text style={styles.itemMeta}>
          {item.product.brand} · {formatUSD(item.product.priceUsd)} c/u
        </Text>
      </View>
      <View style={styles.itemControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease} accessibilityLabel="Menos">
          <Ionicons name="remove" size={16} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} accessibilityLabel="Más">
          <Ionicons name="add" size={16} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemSubtotal}>{formatUSD(item.subtotalUsd)}</Text>
        <TouchableOpacity onPress={onRemove} accessibilityLabel="Quitar">
          <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function CartPanel({ onCheckout, embedded = false, onBrowseProducts }: CartPanelProps) {
  const { items, addItem, updateQuantity, removeItem, clearCart, totalUsd, totalItems } = useCart()
  const { store } = useAuth()
  const usarTasaManual = store?.usarTasaManual ?? false
  const {
    usdBsRateEfectivo,
    isLoading: isLoadingTasa,
    tasas,
  } = useTasaCambio(store?.usdBsRate ?? 36.5, usarTasaManual)
  const totalBs = totalUsd * usdBsRateEfectivo

  const handleClear = () => {
    Alert.alert('Vaciar carrito', '¿Eliminar todos los productos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: () => {
          void hapticLight()
          clearCart()
        },
      },
    ])
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="cart-outline"
          title="Carrito vacío"
          subtitle={
            embedded ? 'Toca + en un producto para agregarlo' : 'Agrega productos desde el POS'
          }
        />
        {!embedded && onBrowseProducts ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBrowseProducts}>
            <Text style={styles.backBtnText}>Buscar productos</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryItems}>
          {totalItems} producto{totalItems !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onIncrease={() => {
              void hapticLight()
              addItem(item.product)
            }}
            onDecrease={() => updateQuantity(item.product.id, item.quantity - 1)}
            onRemove={() => removeItem(item.product.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total USD</Text>
            <Text style={styles.totalSubvalue}>
              {formatBS(totalBs)}
              {isLoadingTasa && !tasas ? ' · consultando BCV' : ''}
            </Text>
          </View>
          <Text style={styles.totalValue}>{formatUSD(totalUsd)}</Text>
        </View>
        <Text style={styles.rateHint}>
          Tasa aplicada: Bs. {usdBsRateEfectivo.toFixed(2)} por USD
        </Text>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => {
            void hapticLight()
            onCheckout()
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="card-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.checkoutBtnText}>Cobrar {formatUSD(totalUsd)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  backBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.orange,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  backBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bg.border,
  },
  summaryItems: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  clearText: {
    color: colors.semantic.error,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
    ...shadows.sm,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semibold,
  },
  itemMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  qtyBtn: {
    backgroundColor: colors.bg.elevated,
    borderRadius: borderRadius.sm,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.base,
    minWidth: 24,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  itemSubtotal: {
    fontSize: typography.size.md,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  footer: {
    backgroundColor: colors.bg.secondary,
    padding: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bg.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: typography.size.lg,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
  },
  totalValue: {
    fontSize: typography.size.xl,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
  },
  totalSubvalue: {
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    marginTop: 2,
  },
  rateHint: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    marginBottom: spacing.sm,
  },
  checkoutBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  checkoutBtnText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
})
