import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { ThemedText } from '@/components/ThemedText'
import { formatCurrency } from '@/utils/format'

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
  onClose: () => void
  onSaved?: () => void
  isTablet: boolean
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo' },
  { id: 'yape_plin', label: 'Yape / Plin' },
  { id: 'card', label: 'Tarjeta' },
  { id: 'transfer', label: 'Transferencia' },
] as const

export function ProductSaleModal({
  visible,
  appointments,
  initialAppointmentId = null,
  onClose,
  onSaved,
  isTablet,
}: Props) {
  const { theme } = useTheme()
  const { config } = useTenant()
  const { userId } = useAuth()
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

  const { data: products = [], isLoading } = useQuery<SellableProduct[]>({
    queryKey: ['retail_sellable_products'],
    enabled: visible,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, quantity, price, unit')
        .eq('is_sellable', true)
        .order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as SellableProduct[]
    },
  })

  const selectedProduct = products.find((product) => product.id === productId)
  const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1)
  const total = selectedProduct ? Number(selectedProduct.price ?? 0) * parsedQuantity : 0

  useEffect(() => {
    if (!visible) return
    const appointment = appointments.find((item) => item.id === initialAppointmentId)
    setProductId('')
    setQuantity('1')
    setAppointmentId(initialAppointmentId)
    setClientId(appointment?.client_id ?? null)
    setClientName(appointment?.client_name ?? '')
    setClientPhone('')
    setMethod('cash')
    setChargeNow(true)
    setNotes('')
  }, [visible, initialAppointmentId, appointments])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error('Selecciona un producto')
      if (!clientName.trim()) throw new Error('Ingresa el nombre de la clienta')
      if (total <= 0) throw new Error('El producto no tiene precio de venta')

      const status = selectedProduct.quantity >= parsedQuantity ? 'reserved' : 'pedido'
      const { data: order, error } = await supabase
        .from('product_orders')
        .insert({
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
        if (paymentError) throw new Error(paymentError.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['retail_sellable_products'] })
      void queryClient.invalidateQueries({ queryKey: ['retail_product_orders'] })
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      onSaved?.()
      onClose()
    },
    onError: (error: Error) => Alert.alert('No se pudo registrar', error.message),
  })

  const currency = config.locale.currency
  const appointmentLabel = useMemo(
    () =>
      appointments.find((item) => item.id === appointmentId)?.client_name ?? 'Sin cita vinculada',
    [appointmentId, appointments]
  )

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, isTablet && styles.overlayTablet]}>
        <View
          style={[
            styles.content,
            { backgroundColor: theme.backgroundDefault },
            isTablet && styles.contentTablet,
          ]}
        >
          <View style={styles.header}>
            <ThemedText style={styles.title}>Venta de producto</ThemedText>
            <Pressable onPress={onClose} accessibilityLabel="Cerrar">
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Producto vendible
            </ThemedText>
            {isLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <View style={styles.chips}>
                {products.map((product) => {
                  const selected = product.id === productId
                  return (
                    <Pressable
                      key={product.id}
                      onPress={() => setProductId(product.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: selected ? theme.buttonText : theme.text }}>
                        {product.name} · {formatCurrency(Number(product.price ?? 0), config)}
                      </ThemedText>
                    </Pressable>
                  )
                })}
              </View>
            )}

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Cantidad</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={theme.textMuted}
            />

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Clienta</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Nombre de la clienta"
              placeholderTextColor={theme.textMuted}
            />
            <TextInput
              style={[
                styles.input,
                styles.spacedInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="Teléfono (opcional)"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
            />

            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Cita relacionada
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => {
                  setAppointmentId(null)
                  setClientId(null)
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: appointmentId === null ? theme.primary : theme.border,
                    backgroundColor:
                      appointmentId === null ? theme.primary : theme.backgroundSecondary,
                  },
                ]}
              >
                <ThemedText
                  style={{ color: appointmentId === null ? theme.buttonText : theme.text }}
                >
                  Sin cita
                </ThemedText>
              </Pressable>
              {appointments.map((appointment) => (
                <Pressable
                  key={appointment.id}
                  onPress={() => {
                    setAppointmentId(appointment.id)
                    setClientId(appointment.client_id ?? null)
                    setClientName(appointment.client_name)
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: appointmentId === appointment.id ? theme.primary : theme.border,
                      backgroundColor:
                        appointmentId === appointment.id
                          ? theme.primary
                          : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: appointmentId === appointment.id ? theme.buttonText : theme.text,
                    }}
                  >
                    {appointment.client_name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
              {appointmentLabel}
            </ThemedText>

            <Pressable onPress={() => setChargeNow((value) => !value)} style={styles.checkRow}>
              <Feather
                name={chargeNow ? 'check-square' : 'square'}
                size={20}
                color={chargeNow ? theme.primary : theme.textMuted}
              />
              <ThemedText style={{ color: theme.text }}>
                Cobrar ahora{total > 0 ? ` · ${formatCurrency(total, config)}` : ''}
              </ThemedText>
            </Pressable>

            {chargeNow && (
              <View style={styles.chips}>
                {PAYMENT_METHODS.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setMethod(item.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: method === item.id ? theme.primary : theme.border,
                        backgroundColor:
                          method === item.id ? theme.primary : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{ color: method === item.id ? theme.buttonText : theme.text }}
                    >
                      {item.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}

            <TextInput
              style={[
                styles.input,
                styles.notes,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas (opcional)"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </ScrollView>

          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={[
              styles.submit,
              { backgroundColor: theme.primary },
              saveMutation.isPending && { opacity: 0.6 },
            ]}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <>
                <Feather name="check" size={18} color={theme.buttonText} />
                <ThemedText style={[styles.submitText, { color: theme.buttonText }]}>
                  {chargeNow ? 'Registrar venta cobrada' : 'Guardar apartado'}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
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
  label: { fontSize: 13, fontWeight: '600', marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  spacedInput: { marginTop: Spacing.sm },
  notes: { minHeight: 72, height: 72, paddingVertical: Spacing.sm, marginTop: Spacing.lg },
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  submit: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  submitText: { fontSize: 15, fontWeight: '700' },
})
