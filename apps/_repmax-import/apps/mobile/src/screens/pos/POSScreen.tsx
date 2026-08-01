// ============================================================
// RepMAX Business Suite — Pantalla POS (búsqueda de productos)
// El cajero busca productos y los agrega al carrito.
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../context/CartContext';
import { formatUSD } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Product } from '../../types/database';
import type { POSStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<POSStackParamList, 'POS'>;

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const color = stock === 0
    ? colors.status.outOfStock
    : stock <= minStock
    ? colors.status.lowStock
    : colors.status.inStock;

  const label = stock === 0 ? 'Sin stock' : `${stock} uds`;

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const outOfStock = product.stock === 0;
  return (
    <View style={[styles.productCard, outOfStock && styles.productCardDisabled]}>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
        <Text style={styles.productMeta}>{product.brand} · {product.model}</Text>
        {product.partNumber ? (
          <Text style={styles.productPart}>#{product.partNumber}</Text>
        ) : null}
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{formatUSD(product.priceUsd)}</Text>
          <StockBadge stock={product.stock} minStock={product.minStock} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
        onPress={onAdd}
        disabled={outOfStock}
      >
        <Ionicons
          name="add"
          size={24}
          color={outOfStock ? colors.text.disabled : colors.text.inverse}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function POSScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState<'all' | 'NEW' | 'USED'>('all');

  const { products, isLoading } = useProducts({ q: query, condition: condition === 'all' ? undefined : condition });
  const { addItem, totalItems } = useCart();

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, marca, modelo..."
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

      {/* Filtros de condición */}
      <View style={styles.filters}>
        {(['all', 'NEW', 'USED'] as const).map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.filterChip, condition === c && styles.filterChipActive]}
            onPress={() => setCondition(c)}
          >
            <Text style={[styles.filterChipText, condition === c && styles.filterChipTextActive]}>
              {c === 'all' ? 'Todos' : c === 'NEW' ? 'Nuevo' : 'Usado'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de productos */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onAdd={() => addItem(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={colors.text.disabled} />
              <Text style={styles.emptyText}>No se encontraron productos</Text>
            </View>
          }
        />
      )}

      {/* Botón flotante del carrito */}
      {totalItems > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="cart" size={22} color={colors.text.inverse} />
          <Text style={styles.cartFabText}>Ver carrito</Text>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{totalItems}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
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
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  filterChipActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  filterChipText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100, // espacio para el FAB
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semibold,
  },
  productMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  productPart: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  productPrice: {
    fontSize: typography.size.md,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
  },
  addBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  addBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.md,
  },
  emptyText: {
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
  },
  cartFab: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  cartFabText: {
    color: colors.text.inverse,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
  },
  cartBadge: {
    backgroundColor: colors.bg.primary,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
  },
});
