import React from 'react'
import { ActivityIndicator, Modal, Pressable, TextInput, View } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/theme'

import { CATEGORY_LABELS, INVENTORY_CATEGORIES } from '../constants'
import type { InventoryFormState, InventoryItem } from '../types'
import { inventoryStyles as styles } from '../inventoryStyles'

interface InventoryItemModalProps {
  visible: boolean
  editingItem: InventoryItem | null
  formData: InventoryFormState
  setFormData: React.Dispatch<React.SetStateAction<InventoryFormState>>
  currencySymbol: string
  isSubmitting: boolean
  theme: {
    backgroundDefault: string
    backgroundSecondary: string
    border: string
    text: string
    textSecondary: string
    textMuted: string
    primary: string
  }
  onClose: () => void
  onSubmit: () => void
}

export function InventoryItemModal({
  visible,
  editingItem,
  formData,
  setFormData,
  currencySymbol,
  isSubmitting,
  theme,
  onClose,
  onSubmit,
}: InventoryItemModalProps) {
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundSecondary,
      color: theme.text,
      borderColor: theme.border,
    },
  ]

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
            </ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Nombre
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="Nombre del producto"
            placeholderTextColor={theme.textMuted}
            value={formData.name}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Cantidad
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={formData.quantity}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, quantity: text }))}
              />
            </View>
            <View style={styles.halfInput}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Stock Mínimo
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="5"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                value={formData.minStock}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, minStock: text }))}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Unidad
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="unidad, caja..."
                placeholderTextColor={theme.textMuted}
                value={formData.unit}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, unit: text }))}
              />
            </View>
            <View style={styles.halfInput}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {`Costo (${currencySymbol})`}
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                value={formData.cost}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, cost: text }))}
              />
            </View>
          </View>

          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Categoría
          </ThemedText>
          <View style={[styles.row, { marginBottom: 0 }]}>
            {INVENTORY_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      formData.category === cat ? theme.primary : theme.backgroundSecondary,
                    borderColor: formData.category === cat ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
              >
                <ThemedText
                  style={[
                    styles.categoryChipText,
                    {
                      color: formData.category === cat ? '#FFFFFF' : theme.text,
                    },
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.light.white} />
            ) : (
              <ThemedText style={styles.submitButtonText}>
                {editingItem ? 'Guardar' : 'Agregar'}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
