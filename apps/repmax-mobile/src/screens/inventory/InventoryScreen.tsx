// ============================================================
// RepMAX Business Suite — Pantalla de Inventario
// Phone: lista 1 col · Tablet: grid 2–3 cols
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SearchBar } from '../../components/ui/SearchBar';
import { FilterChip } from '../../components/ui/FilterChips';
import { EmptyState } from '../../components/ui/EmptyState';
import { FAB } from '../../components/ui/FAB';
import { useProducts } from '../../hooks/useProducts';
import { useBreakpointValue } from '../../hooks/useResponsive';
import { useTabBarOffset } from '../../hooks/useTabBarOffset';
import { productService } from '../../services/productService';
import { formatUSD } from '../../utils/formatters';
import { colors, typography, spacing, borderRadius, shadows } from '../../utils/theme';
import type { Product } from '../../types/database';
import type { InventoryStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InventoryStackParamList, 'Inventory'>;

const CONDITION_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'NEW' as const, label: 'Nuevos' },
  { value: 'USED' as const, label: 'Usados' },
];

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

function ProductRow({
  product,
  onEdit,
  onDeactivate,
  grid,
}: {
  product: Product;
  onEdit: () => void;
  onDeactivate: () => void;
  grid?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.productRow, grid && styles.productCardGrid]}
      onPress={onEdit}
      activeOpacity={0.8}
    >
      <View style={[styles.productLeft, grid && styles.productLeftGrid]}>
        <StockIndicator stock={product.stock} minStock={product.minStock} />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={grid ? 2 : 1}>{product.title}</Text>
          <Text style={styles.productMeta} numberOfLines={1}>{product.brand} · {product.model}</Text>
          <Text style={styles.productStock}>
            Stock:{' '}
            <Text style={{ color: product.stock <= product.minStock ? colors.semantic.warning : colors.text.primary }}>
              {product.stock}
            </Text>
            {product.partNumber ? ` · #${product.partNumber}` : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.productRight, grid && styles.productRightGrid]}>
        <Text style={styles.productPrice}>{formatUSD(product.priceUsd)}</Text>
        <View style={[styles.conditionBadge, { backgroundColor: product.condition === 'NEW' ? colors.status.new + '22' : colors.status.used + '22' }]}>
          <Text style={[styles.conditionText, { color: product.condition === 'NEW' ? colors.status.new : colors.status.used }]}>
            {product.condition === 'NEW' ? 'Nuevo' : 'Usado'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDeactivate}
          style={styles.deactivateBtn}
          accessibilityLabel="Desactivar producto"
        >
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
  const { listPaddingWithFab } = useTabBarOffset();
  const numColumns = useBreakpointValue({
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 3,
  });

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

  const isGrid = numColumns > 1;

  return (
    <View style={styles.container}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar producto..."
      />

      <View style={styles.filters}>
        {CONDITION_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            selected={condition === opt.value}
            onPress={() => setCondition(opt.value)}
          />
        ))}
        <FilterChip
          label="Stock bajo"
          icon="alert-circle-outline"
          tone="warning"
          selected={stockFilter === 'low'}
          onPress={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          key={`inv-cols-${numColumns}`}
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={isGrid ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <View style={isGrid ? styles.gridCell : undefined}>
              <ProductRow
                product={item}
                grid={isGrid}
                onEdit={() => navigation.navigate('ProductForm', { productId: item.id })}
                onDeactivate={() => handleDeactivate(item)}
              />
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: listPaddingWithFab }]}
          ListEmptyComponent={
            <EmptyState icon="cube-outline" title="No hay productos" />
          }
        />
      )}

      <FAB
        icon="add"
        accessibilityLabel="Agregar producto"
        onPress={() => navigation.navigate('ProductForm', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  list: {
    padding: spacing.md,
  },
  gridRow: {
    gap: spacing.sm,
  },
  gridCell: {
    flex: 1,
  },
  productRow: {
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
  productCardGrid: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 140,
  },
  productLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  productLeftGrid: {
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
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
  productRightGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  errorText: {
    color: colors.semantic.error,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontFamily: typography.fontFamily.regular,
  },
});
