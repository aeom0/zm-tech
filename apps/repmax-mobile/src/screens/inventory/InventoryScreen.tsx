// ============================================================
// RepMAX Business Suite — Pantalla de Inventario
// Lista de productos con filtros, búsqueda y acceso a edición.
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useProducts } from '../../hooks/useProducts';
import { productService } from '../../services/productService';
import { formatUSD } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Product } from '../../types/database';
import type { InventoryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InventoryStackParamList, 'Inventory'>;

function StockIndicator({ stock, minStock }: { stock: number; minStock: number }) {
  const color = stock === 0
    ? colors.status.outOfStock
    : stock <= minStock
    ? colors.status.lowStock
    : colors.status.inStock;

  return (
    <View style={[styles.stockDot, { backgroundColor: color }]} />
  );
}

function ProductRow({ product, onEdit, onDeactivate }: {
  product: Product;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <TouchableOpacity style={styles.productRow} onPress={onEdit}>
      <View style={styles.productLeft}>
        <StockIndicator stock={product.stock} minStock={product.minStock} />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
          <Text style={styles.productMeta}>{product.brand} · {product.model}</Text>
          <Text style={styles.productStock}>
            Stock: <Text style={{ color: product.stock <= product.minStock ? colors.semantic.warning : colors.text.primary }}>
              {product.stock}
            </Text>
            {product.partNumber ? ` · #${product.partNumber}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.productRight}>
        <Text style={styles.productPrice}>{formatUSD(product.priceUsd)}</Text>
        <View style={[styles.conditionBadge, { backgroundColor: product.condition === 'NEW' ? colors.status.new + '22' : colors.status.used + '22' }]}>
          <Text style={[styles.conditionText, { color: product.condition === 'NEW' ? colors.status.new : colors.status.used }]}>
            {product.condition === 'NEW' ? 'Nuevo' : 'Usado'}
          </Text>
        </View>
        <TouchableOpacity onPress={onDeactivate} style={styles.deactivateBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function InventoryScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState<'all' | 'NEW' | 'USED'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');

  const { products, isLoading, error, refetch } = useProducts({
    q: query || undefined,
    condition: condition === 'all' ? undefined : condition,
    stock: stockFilter === 'low' ? 'low' : undefined,
  });

  const handleDeactivate = (product: Product) => {
    Alert.alert(
      'Desactivar producto',
      `¿Desactivar "${product.title}"? Ya no aparecerá en el inventario ni en el POS.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deactivate(product.id);
              refetch();
            } catch {
              Alert.alert('Error', 'No se pudo desactivar el producto.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Búsqueda */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
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

      {/* Filtros */}
      <View style={styles.filters}>
        {(['all', 'NEW', 'USED'] as const).map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, condition === c && styles.chipActive]}
            onPress={() => setCondition(c)}
          >
            <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>
              {c === 'all' ? 'Todos' : c === 'NEW' ? 'Nuevos' : 'Usados'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, stockFilter === 'low' && styles.chipWarning]}
          onPress={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
        >
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={stockFilter === 'low' ? colors.semantic.warning : colors.text.secondary}
          />
          <Text style={[styles.chipText, stockFilter === 'low' && { color: colors.semantic.warning }]}>
            Stock bajo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              onEdit={() => navigation.navigate('ProductForm', { productId: item.id })}
              onDeactivate={() => handleDeactivate(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={colors.text.disabled} />
              <Text style={styles.emptyText}>No hay productos</Text>
            </View>
          }
        />
      )}

      {/* FAB para agregar */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ProductForm', {})}
      >
        <Ionicons name="add" size={28} color={colors.text.inverse} />
      </TouchableOpacity>
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
  searchIcon: { marginRight: spacing.sm },
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
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.bg.border,
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.brand.orange,
    borderColor: colors.brand.orange,
  },
  chipWarning: {
    borderColor: colors.semantic.warning,
  },
  chipText: {
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
  chipTextActive: {
    color: colors.text.inverse,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  productRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  productLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  productStock: {
    fontSize: typography.size.xs,
    color: colors.text.disabled,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  productRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  productPrice: {
    fontSize: typography.size.md,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  conditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  conditionText: {
    fontSize: typography.size.xs,
    fontFamily: typography.fontFamily.medium,
  },
  deactivateBtn: {
    padding: spacing.xs,
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
  errorText: {
    color: colors.semantic.error,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontFamily: typography.fontFamily.regular,
  },
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
});
