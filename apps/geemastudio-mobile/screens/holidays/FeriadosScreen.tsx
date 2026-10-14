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
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { Feather } from '@expo/vector-icons'

import { DateField } from '@/components/DateField'
import { ScrollFadeRow } from '@/components/ScrollFadeRow'
import { ThemedText } from '@/components/ThemedText'
import { useTheme } from '@/hooks/useTheme'
import { useTenant } from '@/contexts/TenantContext'
import { Spacing, BorderRadius } from '@/constants/theme'
import {
  dateKeyEnZona,
  describeSpecialDayHours,
  formatHourLabel,
  zonaIANASegura,
} from '@zmtech/tenant-config'
import { useSalonHolidaysAdmin, type SalonHolidayRecord } from './hooks/useSalonHolidaysAdmin'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
/** null = horario habitual del día. */
const OPEN_FROM_OPTIONS: (number | null)[] = [null, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const OPEN_UNTIL_OPTIONS: (number | null)[] = [null, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

function HourChips({
  options,
  value,
  onChange,
  isDisabled,
}: {
  options: (number | null)[]
  value: number | null
  onChange: (hour: number | null) => void
  isDisabled?: (hour: number) => boolean
}) {
  const { theme } = useTheme()
  return (
    <ScrollFadeRow
      backgroundColor={theme.backgroundDefault}
      contentContainerStyle={styles.chips}
      style={styles.chipsRow}
    >
      {options.map((h) => {
        const active = value === h
        const disabled = h !== null && (isDisabled?.(h) ?? false)
        return (
          <Pressable
            key={h ?? 'habitual'}
            onPress={() => onChange(h)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            style={[
              styles.chip,
              {
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? `${theme.primary}18` : 'transparent',
                opacity: disabled ? 0.35 : 1,
              },
            ]}
          >
            <ThemedText
              style={{
                color: active ? theme.primary : theme.text,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {h === null ? 'Como siempre' : formatHourLabel(h)}
            </ThemedText>
          </Pressable>
        )
      })}
    </ScrollFadeRow>
  )
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
  const tabBarHeight = useBottomTabBarHeight()
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

  const today = dateKeyEnZona(new Date(), zonaIANASegura(config.locale.timezone))

  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<SalonHolidayRecord | null>(null)
  const [formDate, setFormDate] = useState('')
  const [formName, setFormName] = useState('')
  const [formClosed, setFormClosed] = useState(false)
  const [formOpenFrom, setFormOpenFrom] = useState<number | null>(null)
  const [formOpenUntil, setFormOpenUntil] = useState<number | null>(null)
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
    setFormOpenFrom(null)
    setFormOpenUntil(null)
    setModalVisible(true)
  }

  const openEdit = (row: SalonHolidayRecord) => {
    setEditing(row)
    setFormDate(row.date.slice(0, 10))
    setFormName(row.name)
    setFormClosed(row.is_closed)
    setFormOpenFrom(row.open_from_hour)
    setFormOpenUntil(row.open_until_hour)
    setModalVisible(true)
  }

  const handleSave = async () => {
    const date = formDate.trim()
    const name = formName.trim()
    if (!DATE_RE.test(date)) {
      Alert.alert('Falta la fecha', 'Elige la fecha del feriado.')
      return
    }
    if (!name) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para el día.')
      return
    }
    if (
      !formClosed &&
      formOpenFrom !== null &&
      formOpenUntil !== null &&
      formOpenFrom > formOpenUntil
    ) {
      Alert.alert('Horario inválido', 'La última cita no puede ser antes de la hora de apertura.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateHoliday.mutateAsync({
          id: editing.id,
          name,
          is_closed: formClosed,
          open_from_hour: formOpenFrom,
          open_until_hour: formOpenUntil,
        })
      } else {
        await createHoliday.mutateAsync({
          date,
          name,
          is_closed: formClosed,
          open_from_hour: formOpenFrom,
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
          paddingBottom: tabBarHeight + Spacing['3xl'] + Spacing.inputHeight,
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
              País: {config.locale.country}. Toca un día para editarlo. Puedes cerrarlo o recortar
              el horario: abrir más tarde, adelantar la última cita, o ambas.
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
              No hay feriados. Usa “Recargar nacionales” o agrega uno.
            </ThemedText>
          )
        }
        renderItem={({ item }) => {
          const past = item.date.slice(0, 10) < today
          return (
            <Pressable
              onPress={() => openEdit(item)}
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
                <View style={styles.rowNameLine}>
                  <ThemedText style={[styles.rowName, { color: theme.text }]}>
                    {item.name}
                  </ThemedText>
                  {past ? (
                    <View style={[styles.pastChip, { backgroundColor: theme.backgroundRoot }]}>
                      <ThemedText style={[styles.pastChipText, { color: theme.textMuted }]}>
                        Pasado
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText style={[styles.rowMeta, { color: theme.textMuted }]}>
                  {formatDateEs(item.date, config.locale.language)}
                </ThemedText>
                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: item.is_closed ? `${theme.error}18` : `${theme.primary}18`,
                    },
                  ]}
                >
                  <Feather
                    name={item.is_closed ? 'slash' : 'clock'}
                    size={12}
                    color={item.is_closed ? theme.error : theme.primary}
                  />
                  <ThemedText
                    style={[
                      styles.statusChipText,
                      { color: item.is_closed ? theme.error : theme.primary },
                    ]}
                  >
                    {item.is_closed
                      ? 'Cerrado, sin citas'
                      : describeSpecialDayHours({
                          openFromHour: item.open_from_hour,
                          openUntilHour: item.open_until_hour,
                        })}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={() => handleDelete(item)}
                hitSlop={10}
                style={styles.deleteBtn}
                accessibilityLabel={`Eliminar feriado ${item.name}`}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
              </Pressable>
            </Pressable>
          )
        }}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.lg }]}
        onPress={openCreate}
      >
        <Feather name="plus" size={22} color={theme.buttonText} />
        <ThemedText style={[styles.fabText, { color: theme.buttonText }]}>Agregar</ThemedText>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.modalTitle}>
              {editing ? 'Editar día' : 'Nuevo feriado o día especial'}
            </ThemedText>
            {!editing ? (
              <>
                <DateField
                  label="Fecha"
                  value={formDate || null}
                  onChange={setFormDate}
                  minDate={today}
                  backgroundColor={theme.backgroundSecondary}
                  style={styles.dateField}
                />
              </>
            ) : (
              <ThemedText
                style={[styles.rowMeta, { color: theme.textMuted, marginBottom: Spacing.md }]}
              >
                {formatDateEs(formDate, config.locale.language)}
              </ThemedText>
            )}
            <ThemedText style={[styles.label, { color: theme.textMuted }]}>Nombre</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              value={formName}
              onChangeText={setFormName}
              placeholder="Navidad, Horario de tarde…"
              placeholderTextColor={theme.textMuted}
            />
            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text, fontWeight: '600' }}>
                Cerrado todo el día (sin citas)
              </ThemedText>
              <Switch
                value={formClosed}
                onValueChange={setFormClosed}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
            {!formClosed ? (
              <>
                <ThemedText style={[styles.label, { color: theme.textMuted }]}>
                  Abre a (primera cita)
                </ThemedText>
                <HourChips
                  options={OPEN_FROM_OPTIONS}
                  value={formOpenFrom}
                  onChange={setFormOpenFrom}
                  isDisabled={(h) => formOpenUntil !== null && h > formOpenUntil}
                />
                <ThemedText style={[styles.label, { color: theme.textMuted }]}>
                  Última cita
                </ThemedText>
                <HourChips
                  options={OPEN_UNTIL_OPTIONS}
                  value={formOpenUntil}
                  onChange={setFormOpenUntil}
                  isDisabled={(h) => formOpenFrom !== null && h < formOpenFrom}
                />
                <ThemedText style={[styles.helper, { color: theme.textMuted }]}>
                  “Como siempre” usa el horario normal de ese día de la semana.
                </ThemedText>
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
                style={[
                  styles.modalBtn,
                  { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.buttonText} />
                ) : (
                  <ThemedText style={{ color: theme.buttonText, fontWeight: '700' }}>
                    Guardar
                  </ThemedText>
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
  dateField: { marginBottom: Spacing.md },
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
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowName: { fontSize: 15, fontWeight: '600' },
  pastChip: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  pastChipText: { fontSize: 10, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { paddingLeft: Spacing.sm },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
  },
  fabText: { fontWeight: '700', fontSize: 15 },
  modalOverlay: {
    flex: 1,
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
  chipsRow: { marginBottom: Spacing.md },
  chips: { flexDirection: 'row', gap: Spacing.sm },
  helper: { fontSize: 12, lineHeight: 17, marginBottom: Spacing.lg },
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
