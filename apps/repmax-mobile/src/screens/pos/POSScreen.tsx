// ============================================================
// RepMAX Business Suite — Pantalla POS (búsqueda de productos)
// Phone: lista + ActionBar · Tablet+: catálogo | carrito (split)
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useFocusEffect } from '@react-navigation/native'

import { SearchBar } from '../../components/ui/SearchBar'
import { FilterChips } from '../../components/ui/FilterChips'
import { EmptyState } from '../../components/ui/EmptyState'
import { ActionBar } from '../../components/ui/FAB'
import { CartPanel } from '../../components/pos/CartPanel'
import { ProductThumb } from '../../components/inventory/ProductThumb'
import { useProducts } from '../../hooks/useProducts'
import { useCart } from '../../context/CartContext'
import { useResponsive, useBreakpointValue } from '../../hooks/useResponsive'
import { useTabBarOffset } from '../../hooks/useTabBarOffset'
import { formatDateTime, formatUSD } from '../../utils/formatters'
import { uriPortada } from '../../utils/productPhotos'
import { hapticLight } from '../../utils/haptics'
import { saleService } from '../../services/saleService'
import { colors, typography, spacing, borderRadius, shadows, layout } from '../../utils/theme'
import type { CashSession, Product } from '../../types/database'
import type { MainTabParamList, POSStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<POSStackParamList, 'POS'>

const CONDITION_OPTIONS = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'NEW' as const, label: 'Nuevo' },
  { value: 'USED' as const, label: 'Usado' },
]

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const color =
    stock === 0
      ? colors.status.outOfStock
      : stock <= minStock
        ? colors.status.lowStock
        : colors.status.inStock

  const label = stock === 0 ? 'Sin stock' : `${stock} uds`

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

function ProductCard({
  product,
  onAdd,
  compact,
}: {
  product: Product
  onAdd: () => void
  compact?: boolean
}) {
  const outOfStock = product.stock === 0
  const portada = uriPortada(product.photos)
  return (
    <View
      style={[
        styles.productCard,
        compact && styles.productCardCompact,
        outOfStock && styles.productCardDisabled,
      ]}
    >
      {compact ? (
        <ProductThumb
          uri={portada}
          size="cover"
          accessibilityLabel={portada ? `Foto de ${product.title}` : `Sin foto: ${product.title}`}
        />
      ) : (
        <ProductThumb
          uri={portada}
          size="md"
          accessibilityLabel={portada ? `Foto de ${product.title}` : `Sin foto: ${product.title}`}
        />
      )}
      <View style={[styles.productInfo, compact && styles.productInfoCompact]}>
        <Text style={styles.productTitle} numberOfLines={compact ? 2 : 1}>
          {product.title}
        </Text>
        <Text style={styles.productMeta} numberOfLines={1}>
          {product.brand} · {product.model}
        </Text>
        {!compact && product.partNumber ? (
          <Text style={styles.productPart}>#{product.partNumber}</Text>
        ) : null}
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{formatUSD(product.priceUsd)}</Text>
          <StockBadge stock={product.stock} minStock={product.minStock} />
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.addBtn,
          compact && styles.addBtnCompact,
          outOfStock && styles.addBtnDisabled,
        ]}
        onPress={onAdd}
        disabled={outOfStock}
        accessibilityLabel={`Agregar ${product.title}`}
      >
        <Ionicons
          name="add"
          size={24}
          color={outOfStock ? colors.text.disabled : colors.text.inverse}
        />
      </TouchableOpacity>
    </View>
  )
}

function CatalogPane({
  navigation,
  showActionBar,
  numColumns,
  onCashPress,
}: {
  navigation: Props['navigation']
  showActionBar: boolean
  numColumns: number
  onCashPress: () => void
}) {
  const [query, setQuery] = useState('')
  const [condition, setCondition] = useState<'all' | 'NEW' | 'USED'>('all')
  const { listPaddingWithActionBar } = useTabBarOffset()
  const { products, isLoading } = useProducts({
    q: query,
    condition: condition === 'all' ? undefined : condition,
  })
  const { addItem, totalItems } = useCart()
  const [session, setSession] = useState<CashSession | null>(null)

  useFocusEffect(
    useCallback(() => {
      let activo = true
      saleService
        .getActiveSession()
        .then((data) => {
          if (activo) setSession(data)
        })
        .catch(() => {})
      return () => {
        activo = false
      }
    }, [])
  )

  const sessionFromPreviousDay =
    session !== null && new Date(session.openedAt).toDateString() !== new Date().toDateString()

  const listPadding = showActionBar ? listPaddingWithActionBar : spacing.xl

  return (
    <View style={styles.catalog}>
      <TouchableOpacity
        style={[
          styles.cashBanner,
          sessionFromPreviousDay ? styles.cashBannerWarning : styles.cashBannerClosed,
        ]}
        onPress={onCashPress}
        activeOpacity={0.8}
      >
        <Ionicons
          name={session ? 'lock-open-outline' : 'lock-closed-outline'}
          size={20}
          color={session ? colors.semantic.warning : colors.semantic.error}
        />
        <View style={styles.cashBannerCopy}>
          <Text style={styles.cashBannerTitle}>
            {sessionFromPreviousDay
              ? 'Caja pendiente de cierre'
              : session
                ? 'Caja abierta'
                : 'Caja cerrada'}
          </Text>
          <Text style={styles.cashBannerText}>
            {sessionFromPreviousDay
              ? `Abierta ${formatDateTime(session.openedAt)}. Revisa el cierre antes de continuar.`
              : session
                ? `Abierta ${formatDateTime(session.openedAt)}`
                : 'Abre la caja para registrar las ventas del día.'}
          </Text>
        </View>
        <Text style={styles.cashBannerAction}>{session ? 'Ver caja' : 'Abrir caja'}</Text>
      </TouchableOpacity>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Nombre, marca, código…"
        onScanPress={() => navigation.navigate('ScanCode', { modo: 'venta' })}
      />

      <FilterChips options={CONDITION_OPTIONS} value={condition} onChange={setCondition} />

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.brand.orange}
          style={{ marginTop: spacing.xl }}
        />
      ) : (
        <FlatList
          key={`pos-cols-${numColumns}`}
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          renderItem={({ item }) => (
            <View style={numColumns > 1 ? styles.gridCell : undefined}>
              <ProductCard
                product={item}
                compact={numColumns > 1}
                onAdd={() => {
                  void hapticLight()
                  addItem(item)
                }}
              />
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: listPadding }]}
          ListEmptyComponent={
            <EmptyState icon="cube-outline" title="No se encontraron productos" />
          }
        />
      )}

      {showActionBar && totalItems > 0 && (
        <ActionBar
          label="Ver carrito"
          icon="cart"
          badge={totalItems}
          onPress={() => navigation.navigate('Cart')}
        />
      )}
    </View>
  )
}

export default function POSScreen({ navigation }: Props) {
  const { isTabletUp } = useResponsive()
  const catalogColumns = useBreakpointValue({
    mobile: 1,
    tablet: 1,
    desktop: 2,
    wide: 2,
  })
  const openCashSession = () => {
    const mainNavigation = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()
    mainNavigation?.navigate('MoreTab', { screen: 'CashSession' })
  }

  if (isTabletUp) {
    return (
      <View style={styles.splitRoot}>
        <View style={styles.splitCatalog}>
          <CatalogPane
            navigation={navigation}
            showActionBar={false}
            numColumns={catalogColumns}
            onCashPress={openCashSession}
          />
        </View>
        <View style={styles.splitDivider} />
        <View style={styles.splitCart}>
          <View style={styles.splitCartHeader}>
            <Ionicons name="cart-outline" size={18} color={colors.brand.orange} />
            <Text style={styles.splitCartTitle}>Carrito</Text>
          </View>
          <CartPanel embedded onCheckout={() => navigation.navigate('Payment')} />
        </View>
      </View>
    )
  }

  return (
    <CatalogPane
      navigation={navigation}
      showActionBar
      numColumns={1}
      onCashPress={openCashSession}
    />
  )
}

const styles = StyleSheet.create({
  catalog: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  cashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  cashBannerWarning: {
    backgroundColor: colors.semantic.warning + '18',
    borderColor: colors.semantic.warning + '55',
  },
  cashBannerClosed: {
    backgroundColor: colors.semantic.error + '12',
    borderColor: colors.semantic.error + '44',
  },
  cashBannerCopy: {
    flex: 1,
  },
  cashBannerTitle: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.semibold,
  },
  cashBannerText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
  cashBannerAction: {
    fontSize: typography.size.xs,
    color: colors.brand.orange,
    fontFamily: typography.fontFamily.bold,
  },
  splitRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg.primary,
  },
  splitCatalog: {
    flex: 1.35,
    minWidth: 0,
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.bg.border,
  },
  splitCart: {
    flex: 1,
    maxWidth: layout.formMaxWidth,
    minWidth: 300,
    backgroundColor: colors.bg.primary,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.bg.border,
  },
  splitCartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bg.border,
  },
  splitCartTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.primary,
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
  productCard: {
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
  productCardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 0,
    overflow: 'hidden',
    minHeight: 96,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productInfoCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
    flexWrap: 'wrap',
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
    marginLeft: spacing.sm,
  },
  addBtnCompact: {
    alignSelf: 'flex-end',
    margin: spacing.md,
    marginTop: spacing.sm,
  },
  addBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
})
