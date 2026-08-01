// ============================================================
// RepMAX Business Suite — Pantalla de Carrito
// Muestra los items seleccionados, permite ajustar cantidades.
// ============================================================
import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useCart } from '../../context/CartContext';
import { formatUSD } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { CartItem } from '../../types/database';
import type { POSStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<POSStackParamList, 'Cart'>;

function CartItemRow({ item, onIncrease, onDecrease, onRemove }: {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.product.title}</Text>
        <Text style={styles.itemMeta}>{item.product.brand} · {formatUSD(item.product.priceUsd)} c/u</Text>
      </View>
      <View style={styles.itemControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease}>
          <Ionicons name="remove" size={16} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease}>
          <Ionicons name="add" size={16} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemSubtotal}>{formatUSD(item.subtotalUsd)}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }: Props) {
  const { items, addItem, updateQuantity, removeItem, clearCart, totalUsd, totalItems } = useCart();

  const handleClear = () => {
    Alert.alert('Vaciar carrito', '¿Eliminar todos los productos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clearCart },
    ]);
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color={colors.text.disabled} />
        <Text style={styles.emptyTitle}>Carrito vacío</Text>
        <Text style={styles.emptySubtitle}>Agrega productos desde el POS</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Buscar productos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con resumen */}
      <View style={styles.summary}>
        <Text style={styles.summaryItems}>{totalItems} producto{totalItems !== 1 ? 's' : ''}</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de items */}
      <FlatList
        data={items}
        keyExtractor={item => item.product.id}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onIncrease={() => addItem(item.product)}
            onDecrease={() => updateQuantity(item.product.id, item.quantity - 1)}
            onRemove={() => removeItem(item.product.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />

      {/* Total y botón de cobro */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatUSD(totalUsd)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Payment')}
        >
          <Ionicons name="card-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.checkoutBtnText}>Cobrar {formatUSD(totalUsd)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.bold,
  },
  emptySubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
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
    borderBottomWidth: 1,
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
    ...shadows.sm,
  },
  itemInfo: {
    flex: 1,
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
    borderTopWidth: 1,
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
});
