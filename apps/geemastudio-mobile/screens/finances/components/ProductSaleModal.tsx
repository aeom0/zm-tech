import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useTheme } from '@/hooks/useTheme'
import { BorderRadius, Spacing } from '@/constants/theme'
import { formatCurrency } from '@/utils/format'
import { ThemedText } from '@/components/ThemedText'
import { useProfileTenantId } from '../hooks/useProfileTenantId'
import type { FinancesAppointmentOption } from '../types'

interface SellableProduct {
  id: string
  name: string
  quantity: number
  price: string | null
  unit: string
}

interface Props {
  visible: boolean
  appointments: FinancesAppointmentOption[]
  initialAppointmentId?: string | null
  initialClientName?: string
  initialClientPhone?: string | null
  onClose: () => void
  onSaved?: () => void
  isTablet?: boolean
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'yape_plin', label: 'Yape / Plin' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
] as const

/** `date` llega como hora Lima literal (a veces con T/Z): leer componentes sin convertir. */
function apptChipLabel(a: FinancesAppointmentOption): string {
  const d = String(a.date ?? '')
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  const when = m ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : ''
  return when ? `${a.client_name} · ${when}` : a.client_name
}

export function ProductSaleModal({
  visible,
  appointments,
  initialAppointmentId = null,
  initialClientName = '',
  initialClientPhone = null,
  onClose,
  onSaved,
  isTablet = false,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const { userId } = useAuth()
  const { tenantId, isLoading: tenantLoading } = useProfileTenantId()
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [method, setMethod] = useState('cash')
  const [chargeNow, setChargeNow] = useState(true)
  const [notes, setNotes] = useState('')

  const { data: products = [], isLoading: productsLoading } = useQuery<SellableProduct[]>({
    queryKey: ['retail_sellable_products', tenantId],
    enabled: visible && !tenantLoading && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, price, unit')
        .eq('tenant_id', tenantId!)
        .eq('is_sellable', true)
        .order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as SellableProduct[]
    },
  })

  const selectedProduct = products.find((product) => product.id === productId)
  const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1)
  const total = selectedProduct ? Number(selectedProduct.price ?? 0) * parsedQuantity : 0

  const isPedido = !!selectedProduct && selectedProduct.quantity < parsedQuantity
  const canSubmit = !!selectedProduct && !!clientName.trim() && total > 0
  const linkedAppointment = appointments.find((item) => item.id === appointmentId)

  useEffect(() => {
    if (!visible) return
    setProductId('')
    setQuantity('1')
    setAppointmentId(initialAppointmentId ?? null)
    setClientId(appointments.find((item) => item.id === initialAppointmentId)?.client_id ?? null)
    setClientName(initialClientName || '')
    setClientPhone(initialClientPhone || '')
    setMethod('cash')
    setChargeNow(true)
    setNotes('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [visible, initialAppointmentId, initialClientName, initialClientPhone])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error('Selecciona un producto')
      if (!clientName.trim()) throw new Error('Ingresa el nombre de la clienta')
      if (total <= 0) throw new Error('El producto no tiene precio de venta')
      if (!tenantId) throw new Error('No se pudo identificar el negocio')

      const status = selectedProduct.quantity >= parsedQuantity ? 'reserved' : 'pedido'
      const { data: order, error } = await supabase
        .from('product_orders')
        .insert({
          tenant_id: tenantId,
          inventory_item_id: selectedProduct.id,
          appointment_id: appointmentId,
          client_id: clientId,
          quantity: parsedQuantity,
          unit_price: total / parsedQuantity,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          source: 'salon',
          notes: notes.trim() || null,
          status,
          created_by: userId,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      if (chargeNow) {
        const { error: paymentError } = await supabase.rpc('mark_product_order_paid', {
          p_order_id: order.id,
          p_method: method,
          p_notes: notes.trim() || null,
        })
        // La orden ya existe: no reintentar el insert (duplicaría el apartado).
        if (paymentError) return { paymentFailed: paymentError.message }
      }
      return { paymentFailed: null as string | null }
    },
    onSuccess: (result) => {
      if (result?.paymentFailed) {
        Alert.alert(
          'Guardado como apartado',
          `La venta se registró pero el cobro no se completó (${result.paymentFailed}). Cóbrala desde el apartado; no la vuelvas a crear.`
        )
      }
      void queryClient.invalidateQueries({
        queryKey: ['retail_sellable_products', tenantId],
      })
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      void queryClient.invalidateQueries({
        queryKey: ['dashboard_stats'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['retail_product_orders'],
      })
      onSaved?.()
      onClose()
    },
    onError: (error: Error) => Alert.alert('No se pudo registrar', error.message),
  })

  const chipStyle = (selected: boolean) => [
    styles.chip,
    {
      borderColor: selected ? theme.primary : theme.border,
      backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
    },
  ]
  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.backgroundSecondary,
    borderColor: theme.border,
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.overlay, isTablet && styles.overlayTablet]}
      >
        <View
          style={[
            styles.content,
            { backgroundColor: theme.backgroundDefault },
            isTablet && styles.contentTablet,
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Venta de producto</ThemedText>
            <Pressable onPress={onClose} accessibilityLabel="Cerrar" hitSlop={12}>
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
          >
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Producto</ThemedText>
            {productsLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : products.length === 0 ? (
              <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
                No hay productos marcados como vendibles en Inventario.
              </ThemedText>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {products.map((product) => {
                  const selected = product.id === productId
                  const outOfStock = product.quantity <= 0
                  return (
                    <Pressable
                      key={product.id}
                      onPress={() => setProductId(product.id)}
                      style={[
                        styles.productRow,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected
                            ? theme.primary + '14'
                            : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <Feather
                        name={selected ? 'check-circle' : 'circle'}
                        size={20}
                        color={selected ? theme.primary : theme.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ color: theme.text, fontWeight: '600' }}>
                          {product.name}
                        </ThemedText>
                        <ThemedText
                          style={{
                            color: outOfStock ? theme.warning : theme.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {outOfStock
                            ? 'Sin stock · se registra como pedido'
                            : `Stock: ${product.quantity} ${product.unit ?? ''}`.trim()}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: theme.gold, fontWeight: '700' }}>
                        {formatCurrency(Number(product.price ?? 0), config)}
                      </ThemedText>
                    </Pressable>
                  )
                })}
              </View>
            )}

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Cantidad</ThemedText>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQuantity(String(Math.max(1, parsedQuantity - 1)))}
                accessibilityLabel="Disminuir cantidad"
                style={[styles.stepBtn, { borderColor: theme.border }]}
              >
                <Feather name="minus" size={18} color={theme.text} />
              </Pressable>
              <ThemedText style={styles.stepValue}>{parsedQuantity}</ThemedText>
              <Pressable
                onPress={() => setQuantity(String(parsedQuantity + 1))}
                accessibilityLabel="Aumentar cantidad"
                style={[styles.stepBtn, { borderColor: theme.border }]}
              >
                <Feather name="plus" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Cita relacionada
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                onPress={() => {
                  setAppointmentId(null)
                  setClientId(null)
                }}
                style={chipStyle(appointmentId === null)}
              >
                <ThemedText
                  style={{
                    color: appointmentId === null ? theme.buttonText : theme.text,
                  }}
                >
                  Sin cita
                </ThemedText>
              </Pressable>
              {appointments.map((appointment) => {
                const selected = appointmentId === appointment.id
                return (
                  <Pressable
                    key={appointment.id}
                    onPress={() => {
                      setAppointmentId(appointment.id)
                      setClientId(appointment.client_id ?? null)
                      setClientName(appointment.client_name)
                    }}
                    style={chipStyle(selected)}
                  >
                    <ThemedText
                      style={{
                        color: selected ? theme.buttonText : theme.text,
                      }}
                    >
                      {apptChipLabel(appointment)}
                    </ThemedText>
                  </Pressable>
                )
              })}
            </ScrollView>

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Clienta</ThemedText>
            <TextInput
              style={[styles.input, inputStyle, !!linkedAppointment && { opacity: 0.7 }]}
              value={clientName}
              onChangeText={setClientName}
              editable={!linkedAppointment}
              placeholder="Nombre de la clienta"
              placeholderTextColor={theme.textMuted}
            />
            {linkedAppointment ? (
              <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
                Vinculada a la cita · elige «Sin cita» para escribir otro nombre
              </ThemedText>
            ) : (
              <TextInput
                style={[styles.input, inputStyle, { marginTop: Spacing.sm }]}
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="Teléfono (opcional)"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            )}

            <View
              style={[
                styles.summary,
                {
                  borderColor: theme.gold + '80',
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <ThemedText style={{ color: theme.textSecondary }}>Total</ThemedText>
                <ThemedText style={styles.summaryTotal}>{formatCurrency(total, config)}</ThemedText>
              </View>
              {selectedProduct && (
                <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
                  {isPedido
                    ? 'Stock insuficiente: se registra como pedido y no descuenta inventario.'
                    : chargeNow
                      ? 'Al cobrar se descuenta del inventario.'
                      : 'Queda apartado; el stock se descuenta al cobrar.'}
                </ThemedText>
              )}
            </View>

            <Pressable
              onPress={() => setChargeNow((value) => !value)}
              style={styles.checkRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: chargeNow }}
            >
              <Feather
                name={chargeNow ? 'check-square' : 'square'}
                size={20}
                color={chargeNow ? theme.primary : theme.textMuted}
              />
              <ThemedText style={{ color: theme.text }}>Cobrar ahora</ThemedText>
            </Pressable>

            {chargeNow && (
              <View style={[styles.chips, { marginTop: Spacing.sm }]}>
                {PAYMENT_METHODS.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setMethod(item.id)}
                    style={chipStyle(method === item.id)}
                  >
                    <ThemedText
                      style={{
                        color: method === item.id ? theme.buttonText : theme.text,
                      }}
                    >
                      {item.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            <TextInput
              style={[styles.input, styles.notes, inputStyle]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas (opcional)"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </ScrollView>

          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canSubmit}
            style={[
              styles.submit,
              { backgroundColor: theme.primary },
              (saveMutation.isPending || !canSubmit) && { opacity: 0.5 },
            ]}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <>
                <Feather name="check" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.submitText, { color: theme.buttonText }]}>
                  {chargeNow ? `Cobrar ${formatCurrency(total, config)}` : 'Guardar apartado'}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayTablet: { justifyContent: 'center', alignItems: 'center' },
  content: {
    maxHeight: '92%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  contentTablet: { width: 560, borderRadius: BorderRadius.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  notes: {
    minHeight: 72,
    height: 72,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  hint: { fontSize: 12, marginTop: Spacing.xs },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  summary: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotal: { fontSize: 22, fontWeight: '700' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  submit: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
