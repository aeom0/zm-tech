// ============================================================
// Escáner de barras / QR — vender, recibir stock o asignar código
// ============================================================
import React, { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { productService } from '../../services/productService'
import { useCart } from '../../context/CartContext'
import { formatUSD } from '../../utils/formatters'
import { hapticError, hapticSuccess } from '../../utils/haptics'
import { normalizarCodigo } from '../../utils/codigoEscaneado'
import { colors, typography, spacing, borderRadius } from '../../utils/theme'
import type { Product } from '../../types/database'
import type { InventoryStackParamList, POSStackParamList, ScanModo } from '../../navigation/types'

type Props = NativeStackScreenProps<POSStackParamList & InventoryStackParamList, 'ScanCode'>

const TIPOS_CODIGO: BarcodeType[] = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
]

const LOCK_MS = 1400

type Banner = { tipo: 'ok' | 'error' | 'info'; texto: string }

function tituloModo(modo: ScanModo): string {
  if (modo === 'venta') return 'Escanear para vender'
  if (modo === 'asignar') return 'Asignar código'
  return 'Escanear inventario'
}

export default function ScanCodeScreen({ route, navigation }: Props) {
  const modo = route.params?.modo ?? 'inventario'
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const { addItem, items, totalItems } = useCart()

  const lockRef = useRef(false)
  const [buscando, setBuscando] = useState(false)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [manual, setManual] = useState('')
  const [torch, setTorch] = useState(false)
  const [encontrado, setEncontrado] = useState<Product | null>(null)
  const [codigoNuevo, setCodigoNuevo] = useState<string | null>(null)
  const [sumando, setSumando] = useState(false)

  const mostrarBanner = useCallback((tipo: Banner['tipo'], texto: string) => {
    setBanner({ tipo, texto })
  }, [])

  const procesarCodigo = useCallback(
    async (raw: string) => {
      const valor = normalizarCodigo(raw)
      if (!valor || lockRef.current) return

      lockRef.current = true
      setBuscando(true)
      setEncontrado(null)
      setCodigoNuevo(null)

      try {
        if (modo === 'asignar') {
          await hapticSuccess()
          navigation.navigate({
            name: 'ProductForm',
            params: { scannedBarcode: valor },
            merge: true,
          })
          return
        }

        const producto = await productService.getByCodigo(valor)

        if (modo === 'venta') {
          if (!producto) {
            await hapticError()
            mostrarBanner('error', 'Este código no está en el inventario')
            return
          }
          const enCarrito = items.find((i) => i.product.id === producto.id)?.quantity ?? 0
          if (enCarrito + 1 > producto.stock) {
            await hapticError()
            mostrarBanner(
              'error',
              producto.stock === 0
                ? `${producto.title} — sin stock`
                : `${producto.title} — solo ${producto.stock} uds`
            )
            return
          }
          addItem(producto)
          await hapticSuccess()
          mostrarBanner('ok', `${producto.title}  +1  ·  ${formatUSD(producto.priceUsd)}`)
          return
        }

        // inventario
        if (!producto) {
          await hapticSuccess()
          setCodigoNuevo(valor)
          mostrarBanner('info', 'Código nuevo — puedes crear el producto')
          return
        }
        await hapticSuccess()
        setEncontrado(producto)
        mostrarBanner('ok', producto.title)
      } catch {
        await hapticError()
        mostrarBanner('error', 'No se pudo buscar el código. Revisa la conexión.')
      } finally {
        setBuscando(false)
        setTimeout(() => {
          lockRef.current = false
        }, LOCK_MS)
      }
    },
    [modo, navigation, addItem, items, mostrarBanner]
  )

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      void procesarCodigo(result.data)
    },
    [procesarCodigo]
  )

  const sumarStock = useCallback(
    async (delta: number) => {
      if (!encontrado) return
      setSumando(true)
      try {
        const actualizado = await productService.incrementStock(encontrado.id, delta)
        setEncontrado(actualizado)
        await hapticSuccess()
        mostrarBanner('ok', `${actualizado.title} · stock ${actualizado.stock}`)
      } catch {
        await hapticError()
        mostrarBanner('error', 'No se pudo actualizar el stock.')
      } finally {
        setSumando(false)
      }
    },
    [encontrado, mostrarBanner]
  )

  if (!permission) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.brand.orange} />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, paddingHorizontal: spacing.xl }]}>
        <Ionicons name="barcode-outline" size={48} color={colors.brand.orange} />
        <Text style={styles.permTitle}>Cámara para escanear</Text>
        <Text style={styles.permBody}>
          Necesitamos la cámara para leer códigos de barras y QR de los repuestos.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={() => void requestPermission()}>
          <Text style={styles.permBtnText}>Permitir cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          <Text style={styles.linkGhost}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Text style={styles.permBody}>El escáner va en el celular, no en el navegador.</Text>
        </View>
      ) : (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: TIPOS_CODIGO }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Cerrar escáner"
        >
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{tituloModo(modo)}</Text>
        <TouchableOpacity
          onPress={() => setTorch((v) => !v)}
          hitSlop={12}
          accessibilityLabel={torch ? 'Apagar linterna' : 'Encender linterna'}
        >
          <Ionicons
            name={torch ? 'flash' : 'flash-outline'}
            size={24}
            color={torch ? colors.brand.orange : colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.finderWrap} pointerEvents="none">
        <View style={styles.finder} />
        <Text style={styles.finderHint}>
          {buscando ? 'Buscando…' : 'Centra el código en el recuadro'}
        </Text>
      </View>

      {banner ? (
        <View
          style={[
            styles.banner,
            banner.tipo === 'ok' && styles.bannerOk,
            banner.tipo === 'error' && styles.bannerError,
            banner.tipo === 'info' && styles.bannerInfo,
          ]}
        >
          <Text style={styles.bannerText}>{banner.texto}</Text>
        </View>
      ) : null}

      {modo === 'inventario' && encontrado ? (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle} numberOfLines={2}>
            {encontrado.title}
          </Text>
          <Text style={styles.sheetMeta}>
            {encontrado.brand} · stock {encontrado.stock}
            {encontrado.barcode ? ` · ${encontrado.barcode}` : ''}
          </Text>
          <View style={styles.sheetRow}>
            <TouchableOpacity
              style={styles.sheetBtn}
              disabled={sumando}
              onPress={() => void sumarStock(1)}
            >
              <Text style={styles.sheetBtnText}>{sumando ? '…' : '+1 al stock'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetBtnGhost}
              onPress={() => navigation.navigate('ProductForm', { productId: encontrado.id })}
            >
              <Text style={styles.sheetBtnGhostText}>Abrir ficha</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {modo === 'inventario' && codigoNuevo ? (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Código nuevo</Text>
          <Text style={styles.sheetMeta} selectable>
            {codigoNuevo}
          </Text>
          <TouchableOpacity
            style={styles.sheetBtn}
            onPress={() => navigation.navigate('ProductForm', { scannedBarcode: codigoNuevo })}
          >
            <Text style={styles.sheetBtnText}>Crear producto</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.manual, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {modo === 'venta' && totalItems > 0 ? (
          <TouchableOpacity
            style={styles.cartLink}
            onPress={() => navigation.navigate('Cart')}
            accessibilityLabel={`Ver carrito, ${totalItems} ítems`}
          >
            <Ionicons name="cart" size={18} color={colors.text.inverse} />
            <Text style={styles.cartLinkText}>Carrito ({totalItems})</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            value={manual}
            onChangeText={setManual}
            placeholder="O escribe el código…"
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (manual.trim()) void procesarCodigo(manual)
            }}
          />
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => {
              if (manual.trim()) void procesarCodigo(manual)
            }}
            accessibilityLabel="Buscar código escrito"
          >
            <Ionicons name="search" size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  permTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    color: colors.text.primary,
    textAlign: 'center',
  },
  permBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  permBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
    fontSize: typography.size.md,
  },
  linkGhost: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    fontSize: typography.size.base,
  },
  webFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    zIndex: 2,
  },
  topTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  finderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finder: {
    width: 240,
    height: 160,
    borderWidth: 2,
    borderColor: colors.brand.orange,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  finderHint: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  banner: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bannerOk: { backgroundColor: colors.semantic.success + 'CC' },
  bannerError: { backgroundColor: colors.semantic.error + 'CC' },
  bannerInfo: { backgroundColor: colors.semantic.info + 'CC' },
  bannerText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.base,
    color: colors.text.primary,
    textAlign: 'center',
  },
  sheet: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bg.border,
  },
  sheetTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  sheetMeta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sheetBtn: {
    flex: 1,
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sheetBtnText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
    fontSize: typography.size.base,
  },
  sheetBtnGhost: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.bg.border,
  },
  sheetBtnGhostText: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    fontSize: typography.size.base,
  },
  manual: {
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  cartLink: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  cartLinkText: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text.inverse,
    fontSize: typography.size.md,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.bg.border,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  manualBtn: {
    backgroundColor: colors.brand.orange,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
