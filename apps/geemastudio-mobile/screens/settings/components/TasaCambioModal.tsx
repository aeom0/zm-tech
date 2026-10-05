import React, { useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  SafeAreaView,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import type { TasasDuales } from '@zmtech/tasas'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { Spacing, BorderRadius, Colors } from '@/constants/theme'

interface TasaCambioModalProps {
  visible: boolean
  usarManual: boolean
  tasaManual: number | null
  tasas: TasasDuales | null
  loading: boolean
  onSave: (usarManual: boolean, tasaManual: number | null) => Promise<void>
  onClose: () => void
}

function formatTasa(valor: number): string {
  return valor.toFixed(2).replace('.', ',')
}

export function TasaCambioModal({
  visible,
  usarManual,
  tasaManual,
  tasas,
  loading,
  onSave,
  onClose,
}: TasaCambioModalProps) {
  const { theme } = useTheme()
  const [manual, setManual] = useState(usarManual)
  const [value, setValue] = useState(tasaManual != null ? String(tasaManual) : '')
  const [prevVisible, setPrevVisible] = useState(visible)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (visible !== prevVisible) {
    setPrevVisible(visible)
    if (visible) {
      setManual(usarManual)
      setValue(tasaManual != null ? String(tasaManual) : '')
      setError(null)
      setSaving(false)
    }
  }

  const parsed = parseFloat(value.replace(',', '.'))
  const manualValida = Number.isFinite(parsed) && parsed > 0
  const canSave = !saving && (!manual || manualValida)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await onSave(manual, manualValida ? Math.round(parsed * 10000) / 10000 : null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la tasa')
    } finally {
      setSaving(false)
    }
  }

  const fila = (label: string, t: TasasDuales['bcv'] | undefined) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.rowLabel, { color: theme.text }]}>{label}</ThemedText>
        <ThemedText style={[styles.rowSub, { color: theme.textMuted }]}>
          {t?.disponible ? `${t.fecha} · ${t.fuente}` : 'Sin datos'}
        </ThemedText>
      </View>
      <ThemedText style={[styles.rowValue, { color: theme.text }]}>
        {t?.disponible ? `Bs. ${formatTasa(t.valor)}` : '—'}
      </ThemedText>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText style={[styles.titulo, { color: theme.text }]}>Tasa de cambio</ThemedText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="x" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.card,
              { borderColor: theme.border, backgroundColor: theme.backgroundDefault },
            ]}
          >
            {loading && !tasas ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                {fila('BCV (oficial)', tasas?.bcv)}
                {fila('USDT (paralelo)', tasas?.usdt)}
                {tasas?.bcv.disponible && tasas.usdt.disponible ? (
                  <ThemedText style={[styles.rowSub, { color: theme.textMuted }]}>
                    {`Diferencia: Bs. ${formatTasa(tasas.spread.absoluto)} (${tasas.spread.porcentaje.toFixed(1)} %)`}
                  </ThemedText>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <ThemedText style={[styles.rowLabel, { color: theme.text }]}>
                Usar tasa manual
              </ThemedText>
              <ThemedText style={[styles.rowSub, { color: theme.textMuted }]}>
                Por defecto se usa la tasa BCV. Activa esta opción para fijar la tuya.
              </ThemedText>
            </View>
            <Switch value={manual} onValueChange={setManual} disabled={saving} />
          </View>

          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            {manual ? 'Bs. por USD' : 'Tasa de respaldo (Bs. por USD)'}
          </ThemedText>
          <TextInput
            value={value}
            onChangeText={setValue}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
            placeholder="0,00"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            editable={!saving}
          />
          {error ? (
            <ThemedText style={[styles.error, { color: theme.error }]}>{error}</ThemedText>
          ) : null}

          <Pressable
            onPress={() => void handleSave()}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.primary, opacity: !canSave ? 0.5 : pressed ? 0.9 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={Colors.light.buttonText} />
            ) : (
              <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titulo: { fontSize: 17, fontWeight: '600' },
  body: { padding: Spacing.lg },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 16, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  label: { fontSize: 13, fontWeight: '500', marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  saveButton: {
    marginTop: Spacing['2xl'],
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  saveButtonText: { color: Colors.light.buttonText, fontSize: 16, fontWeight: '600' },
  error: { fontSize: 13, marginTop: Spacing.sm },
})
