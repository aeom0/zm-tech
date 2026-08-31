import React, { useMemo, useState } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'

import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius } from '@/constants/theme'
import { formatHolidayUntilLabel, zonaIANASegura } from '@zmtech/tenant-config'
import {
  useSalonHolidaysAdmin,
  type SalonHolidayRecord,
} from './hooks/useSalonHolidaysAdmin'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const OPEN_UNTIL_OPTIONS = [12, 13, 14, 15, 16] as const

function todayKeyInZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaIANASegura(timeZone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function formatDateEs(dateKey: string, language: string): string {
  const [y, m, d] = dateKey.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return dt.toLocaleDateString(language || 'es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function FeriadosScreen() {
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  const { config } = useTenant()
  const {
    holidays,
    isLoading,
    isRefreshing,
    refetch,
    reloadCatalogMissing,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  } = useSalonHolidaysAdmin()

  const today = todayKeyInZone(config.locale.timezone)

  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<SalonHolidayRecord | null>(null)
  const [formDate, setFormDate] = useState('')
  const [formName, setFormName] = useState('')
  const [formClosed, setFormClosed] = useState(false)
  const [formOpenUntil, setFormOpenUntil] = useState(12)
  const [saving, setSaving] = useState(false)

  const sorted = useMemo(() => {
    return [...holidays].sort((a, b) => {
      const aPast = a.date.slice(0, 10) < today
      const bPast = b.date.slice(0, 10) < today
      if (aPast !== bPast) return aPast ? 1 : -1
      return a.date.localeCompare(b.date)
    })
  }, [holidays, today])

  const openCreate = () => {
    setEditing(null)
    setFormDate('')
    setFormName('')
    setFormClosed(false)
    setFormOpenUntil(12)
    setModalVisible(true)
  }

  const openEdit = (row: SalonHolidayRecord) => {
    setEditing(row)
    setFormDate(row.date.slice(0, 10))
    setFormName(row.name)
    setFormClosed(row.is_closed)
    setFormOpenUntil(row.open_until_hour ?? 12)
    setModalVisible(true)
  }

  const handleSave = async () => {
    const date = formDate.trim()
    const name = formName.trim()
    if (!DATE_RE.test(date)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD (ej. 2026-08-30).')
      return
    }
    if (!name) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para el feriado.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateHoliday.mutateAsync({
          id: editing.id,
          name,
          is_closed: formClosed,
          open_until_hour: formOpenUntil,
        })
      } else {
        await createHoliday.mutateAsync({
          date,
          name,
          is_closed: formClosed,
          open_until_hour: formOpenUntil,
        })
      }
      setModalVisible(false)
      setEditing(null)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo guardar.'
      const isDup = /duplicate|unique|salon_holidays/i.test(msg)
      Alert.alert('Error', isDup ? 'Ya existe un feriado en esa fecha.' : msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (row: SalonHolidayRecord) => {
    Alert.alert(
      'Eliminar feriado',
      `¿Quitar ${row.name} (${formatDateEs(row.date, config.locale.language)})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            deleteHoliday.mutate(row.id, {
              onError: (e: Error) => Alert.alert('Error', e.message),
            }),
        },
      ]
    )
  }

  const handleReloadCatalog = () => {
    Alert.alert(
      'Recargar feriados nacionales',
      'Se agregan las fechas del catálogo de tu país que falten. No modifica feriados ya editados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recargar',
          onPress: () => {
            void reloadCatalogMissing().catch((e: Error) =>
              Alert.alert('Error', e.message || 'No se pudo recargar')
            )
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refetch()}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerActions}>
            <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
              País: {config.locale.country}. Los cerrados no permiten citas; el
              resto usa horario reducido (10 AM – open until).
            </ThemedText>
            <Pressable
              onPress={handleReloadCatalog}
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
            >
              <Feather name="download" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                Recargar nacionales
              </ThemedText>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing['3xl'] }} />
          ) : (
            <ThemedText style={[styles.empty, { color: theme.textMuted }]}>
              No hay feriados. Usa “Recargar nacionales” o agregá uno.
            </ThemedText>
          )
        }
        renderItem={({ item }) => {
          const past = item.date.slice(0, 10) < today
          return (
            <Pressable
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item)}
              style={[
                styles.row,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                  opacity: past ? 0.55 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.rowName, { color: theme.text }]}>{item.name}</ThemedText>
                <ThemedText style={[styles.rowMeta, { color: theme.textMuted }]}>
                  {formatDateEs(item.date, config.locale.language)}
                  {item.is_closed
                    ? ' · Cerrado'
                    : ` · hasta ${formatHolidayUntilLabel(item.open_until_hour ?? 12)}`}
                </ThemedText>
              </View>
              <Switch
                value={item.is_closed}
                onValueChange={(v) =>
                  updateHoliday.mutate({ id: item.id, is_closed: v })
                }
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </Pressable>
          )
        }}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 24 }]}
        onPress={openCreate}
      >
        <Feather name="plus" size={22} color="#FFF" />
        <ThemedText style={styles.fabText}>Agregar</ThemedText>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.modalTitle}>
              {editing ? 'Editar feriado' : 'Nuevo feriado'}
            </ThemedText>
            {!editing ? (
              <>
                <ThemedText style={[styles.label, { color: theme.textMuted }]}>
                  Fecha (AAAA-MM-DD)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
                  ]}
                  value={formDate}
                  onChangeText={setFormDate}
                  placeholder="2026-12-25"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                />
              </>
            ) : (
              <ThemedText style={[styles.rowMeta, { color: theme.textMuted, marginBottom: Spacing.md }]}>
                {formatDateEs(formDate, config.locale.language)}
              </ThemedText>
            )}
            <ThemedText style={[styles.label, { color: theme.textMuted }]}>Nombre</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              value={formName}
              onChangeText={setFormName}
              placeholder="Navidad"
              placeholderTextColor={theme.textMuted}
            />
            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>Cerrado (sin citas)</ThemedText>
              <Switch
                value={formClosed}
                onValueChange={setFormClosed}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
            {!formClosed ? (
              <>
                <ThemedText style={[styles.label, { color: theme.textMuted }]}>
                  Última hora de inicio
                </ThemedText>
                <View style={styles.chips}>
                  {OPEN_UNTIL_OPTIONS.map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => setFormOpenUntil(h)}
                      style={[
                        styles.chip,
                        {
                          borderColor: formOpenUntil === h ? theme.primary : theme.border,
                          backgroundColor:
                            formOpenUntil === h ? `${theme.primary}18` : 'transparent',
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color: formOpenUntil === h ? theme.primary : theme.text,
                          fontWeight: '600',
                          fontSize: 13,
                        }}
                      >
                        {formatHolidayUntilLabel(h)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => !saving && setModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <ThemedText style={{ color: theme.textSecondary }}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                style={[styles.modalBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Guardar</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerActions: { marginBottom: Spacing.md, gap: Spacing.sm },
  hint: { fontSize: 13, lineHeight: 18 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: Spacing['3xl'], fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: 24,
  },
  fabText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.lg },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  chip: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  modalBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minWidth: 100,
    alignItems: 'center',
  },
})
