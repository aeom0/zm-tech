import React, { useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FormField } from '@/components/FormField'
import { ThemedText } from '@/components/ThemedText'
import { useTenant } from '@/contexts/TenantContext'
import {
  checkDocument,
  checkEmail,
  checkPhone,
  documentPlaceholder,
  phonePlaceholder,
} from '@/lib/clientFields'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'
import type { ClientFormPayload } from '../hooks/useClientsMutations'

interface Props {
  visible: boolean
  mode: 'create' | 'edit'
  initial?: Partial<ClientFormPayload> | null
  saving: boolean
  onClose: () => void
  onSave: (payload: ClientFormPayload) => void
}

export function ClientFormModal({ visible, mode, initial, saving, onClose, onSave }: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const country = useTenant().config.locale.country
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [notes, setNotes] = useState('')

  useResetOnChange([visible, initial], () => {
    if (!visible) return
    setName(initial?.name ?? '')
    setPhone(initial?.phone ?? '')
    setEmail(initial?.email ?? '')
    setDni(initial?.dni ?? '')
    setNotes(initial?.notes ?? '')
  })

  const phoneCheck = checkPhone(phone, country)
  const emailCheck = checkEmail(email)
  const documentCheck = checkDocument(dni, country)

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del cliente.')
      return
    }
    const firstError = phoneCheck.error ?? documentCheck.error ?? emailCheck.error
    if (firstError) {
      Alert.alert('Revisa los datos', firstError)
      return
    }
    onSave({ name, phone, email, dni, notes })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.backgroundDefault,
                paddingBottom: Math.max(insets.bottom, Spacing.lg),
              },
            ]}
          >
            <View style={styles.header}>
              <ThemedText style={[styles.title, { color: theme.text }]}>
                {mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
              </ThemedText>
              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.xl }}
            >
              <FormField
                label="Nombre"
                value={name}
                onChangeText={setName}
                placeholder="Nombre completo"
                autoCapitalize="words"
              />
              <FormField
                label="Teléfono"
                value={phone}
                onChangeText={setPhone}
                placeholder={`Ej. ${phonePlaceholder(country)}`}
                keyboardType="phone-pad"
                error={phoneCheck.error}
                hint={phoneCheck.hint}
              />
              <FormField
                label="Correo"
                value={email}
                onChangeText={setEmail}
                placeholder="opcional"
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailCheck.error}
              />
              <FormField
                label="Documento (DNI, CE o cédula)"
                value={dni}
                onChangeText={setDni}
                placeholder={documentPlaceholder(country)}
                autoCapitalize="characters"
                autoCorrect={false}
                error={documentCheck.error}
                hint={documentCheck.hint}
              />
              <View>
                <ThemedText style={[styles.label, { color: theme.textMuted }]}>Notas</ThemedText>
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
                  placeholder="Alergias, preferencias, recordatorios…"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.light.buttonText} />
              ) : (
                <ThemedText style={styles.saveText}>
                  {mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
  },
  notes: { minHeight: 96, paddingTop: 12 },
  saveBtn: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveText: {
    color: Colors.light.buttonText,
    fontSize: 15,
    fontWeight: '700',
  },
})
