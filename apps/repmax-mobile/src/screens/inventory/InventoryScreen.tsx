// ============================================================
// RepMAX Business Suite — Pantalla de Inventario
// Phone: lista 1 col · Tablet: grid 2–3 cols
// ============================================================
import React, { useCallback, useLayoutEffect, useState } from 'react';
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
import { ProductThumb } from '../../components/inventory/ProductThumb';
import { MlStatusBadge } from '../../components/inventory/MlStatusBadge';
import { useProducts } from '../../hooks/useProducts';
import { useMlExport } from '../../hooks/useMlExport';
import { useBreakpointValue } from '../../hooks/useResponsive';
import { useTabBarOffset } from '../../hooks/useTabBarOffset';
import { productService } from '../../services/productService';
import { formatUSD } from '../../utils/formatters';
import { uriPortada } from '../../utils/productPhotos';
import {
  evaluarListoMl,
  resolverBadgeMl,
  productoPasaFiltroMl,
  type FiltroMlInventario,
} from '../../utils/mlReadiness';
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

const ML_FILTER_OPTIONS: { value: FiltroMlInventario; label: string }[] = [
  { value: 'para_ml', label: 'Para ML' },
  { value: 'listo', label: 'Listo ML' },
  { value: 'incompleto', label: 'Incompleto' },
  { value: 'exportado', label: 'Exportado' },
  { value: 'en_ml', label: 'En ML' },
];

function badgeProducto(product: Product) {
  const portada = uriPortada(product.photos);
  const listo = evaluarListoMl({
    title: product.title,
    partNumber: product.partNumber ?? '',
    description: product.description,
    priceUsd: product.priceUsd,
    stock: product.stock,
    portadaUri: portada,
  }).listo;
  return resolverBadgeMl(
    product.mlPublishIntent ?? false,
    product.mlListingStatus,
    listo,
  );
}

function ProductRow({
  product,
  onEdit,
  onDeactivate,
  grid,
  mlBadge,
}: {
  product: Product;
  onEdit: () => void;
  onDeactivate: () => void;
  grid?: boolean;
  mlBadge: ReturnType<typeof badgeProducto>;
}) {
  const portada = uriPortada(product.photos);

  return (
    <TouchableOpacity
      style={[styles.productRow, grid && styles.productCardGrid]}
      onPress={onEdit}
      activeOpacity={0.8}
    >
      {grid ? (
        <ProductThumb
          uri={portada}
          size="cover"
          accessibilityLabel={portada ? `Foto de ${product.title}` : `Sin foto: ${product.title}`}
        />
      ) : null}
      <View style={[styles.productBody, grid && styles.productBodyGrid]}>
        <View style={[styles.productLeft, grid && styles.productLeftGrid]}>
          {grid ? (
            <StockIndicator stock={product.stock} minStock={product.minStock} />
          ) : (
            <View style={styles.thumbWrap}>
              <ProductThumb
                uri={portada}
                size="md"
                accessibilityLabel={portada ? `Foto de ${product.title}` : `Sin foto: ${product.title}`}
              />
              <View style={styles.stockOnThumb}>
                <StockIndicator stock={product.stock} minStock={product.minStock} />
              </View>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={grid ? 2 : 1}>{product.title}</Text>
            <Text style={styles.productMeta} numberOfLines={1}>{product.brand} · {product.model}</Text>
            <View style={styles.badgeRow}>
              <MlStatusBadge kind={mlBadge} compact />
            </View>
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
      </View>
    </TouchableOpacity>
  );
}

export default function InventoryScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState<'all' | 'NEW' | 'USED'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [mlFilter, setMlFilter] = useState<FiltroMlInventario>('all');
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

  const { isExporting, listosCount, exportar } = useMlExport(products, refetch);

  const ejecutarExport = useCallback(() => {
    if (listosCount === 0) {
      Alert.alert(
        'Nada para exportar',
        'Marca productos con “Incluir en catálogo ML” y completa el checklist (portada, título, n. parte, etc.).',
      );
      return;
    }
    Alert.alert(
      'Exportar a MercadoLibre',
      `Vamos a generar un CSV con ${listosCount} producto(s) listos. Después pégalo en el publicador masivo de ML.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
          onPress: () => {
            void exportar().then((result) => {
              if (result.ok) {
                Alert.alert(
                  'Export listo',
                  `Compartimos ${result.count} producto(s). Los marcamos como Exportado en inventario.`,
                );
              } else {
                Alert.alert('No se exportó', result.message);
              }
            });
          },
        },
      ],
    );
  }, [listosCount, exportar]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={ejecutarExport}
          disabled={isExporting}
          style={styles.headerExportBtn}
          accessibilityLabel="Exportar catálogo ML"
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.brand.orange} />
          ) : (
            <>
              <Ionicons name="download-outline" size={22} color={colors.brand.orange} />
              {listosCount > 0 ? (
                <View style={styles.headerExportBadge}>
                  <Text style={styles.headerExportBadgeText}>{listosCount}</Text>
                </View>
              ) : null}
            </>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, ejecutarExport, isExporting, listosCount]);

  const productosVisibles = products.filter((p) =>
    productoPasaFiltroMl(mlFilter, p.mlPublishIntent ?? false, badgeProducto(p)),
  );

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
        {ML_FILTER_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            selected={mlFilter === opt.value}
            onPress={() => setMlFilter(mlFilter === opt.value ? 'all' : opt.value)}
          />
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.brand.orange} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          key={`inv-cols-${numColumns}`}
          data={productosVisibles}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={isGrid ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <View style={isGrid ? styles.gridCell : undefined}>
              <ProductRow
                product={item}
                grid={isGrid}
                mlBadge={badgeProducto(item)}
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
    padding: 0,
    overflow: 'hidden',
    minHeight: 140,
  },
  productBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productBodyGrid: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: spacing.md,
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
  thumbWrap: {
    position: 'relative',
  },
  stockOnThumb: {
    position: 'absolute',
    right: 4,
    bottom: 4,
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
  badgeRow: {
    marginTop: 4,
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
  headerExportBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerExportBadge: {
    marginLeft: 4,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerExportBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
});
