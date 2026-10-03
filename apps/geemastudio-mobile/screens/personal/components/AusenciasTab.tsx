import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import {
  EMPLOYEE_TIME_OFF_KINDS,
  TIME_OFF_KIND_LABELS,
  trimTime,
  type EmployeeTimeOffKind,
} from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useTheme } from '@/hooks/useTheme'

import {
  useAddCoverage,
  useAddTimeOff,
  useAffectedAppointments,
  useCoverages,
  useDeleteCoverage,
  useDeleteTimeOff,
  useTimeOff,
} from '../hooks/useAvailability'
import { useEmployeesQuery } from '../hooks/useEmployeesData'
import {
  formatIsoDate,
  isValidIsoDate,
  isValidTime,
  rangeLabel,
  todayIso,
} from '../lib/availabilityUi'
import { AvailabilityNote } from './AvailabilityNote'
import { av } from './availabilityStyles'

function confirmDelete(title: string, message: string | undefined, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
  ])
}

function AffectedList({ items }: { items: { id: string; date: string; client_name: string | null }[] }) {
  const { theme } = useTheme()
  if (items.length === 0) return null
  return (
    <AvailabilityNote kind="warning">
      <ThemedText style={{ color: theme.text, fontWeight: '600' }}>
        {items.length} {items.length === 1 ? 'cita quedaría' : 'citas quedarían'} sin profesional
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        Se conservan, pero hay que reasignarlas desde Asignar profesionales.
      </ThemedText>
      {items.slice(0, 8).map((a) => (
        <ThemedText key={a.id} type="small" style={{ color: theme.textSecondary }}>
          {formatIsoDate(a.date.slice(0, 10))} {a.date.slice(11, 16)} · {a.client_name ?? 'Sin nombre'}
        </ThemedText>
      ))}
      {items.length > 8 && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          y {items.length - 8} más
        </ThemedText>
      )}
    </AvailabilityNote>
  )
}

export function AusenciasTab({
  employeeId,
  employeeName,
  staffSingular,
  timezone,
}: {
  employeeId: string
  employeeName: string
  staffSingular: string
  timezone?: string | null
}) {
  const { theme } = useTheme()
  const employeesQuery = useEmployeesQuery()
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data])
  const names = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees])
  const others = employees.filter((e) => e.id !== employeeId && e.is_active)

  const timeOff = useTimeOff(employeeId)
  const coverages = useCoverages()
  const addTimeOff = useAddTimeOff(employeeId)
  const delTimeOff = useDeleteTimeOff(employeeId)
  const addCoverage = useAddCoverage()
  const delCoverage = useDeleteCoverage()

  // Ausencia
  const [kind, setKind] = useState<EmployeeTimeOffKind>('vacation')
  const [from, setFrom] = useState(() => todayIso(timezone))
  const [to, setTo] = useState(() => todayIso(timezone))
  const [datesTouched, setDatesTouched] = useState(false)
  const [openEnded, setOpenEnded] = useState(false)
  const [partial, setPartial] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [reason, setReason] = useState('')
  const [offError, setOffError] = useState<string | null>(null)

  // Cobertura
  const [covering, setCovering] = useState('')
  const [covFrom, setCovFrom] = useState(() => todayIso(timezone))
  const [covTo, setCovTo] = useState(() => todayIso(timezone))
  const [covDatesTouched, setCovDatesTouched] = useState(false)
  const [covNote, setCovNote] = useState('')
  const [covError, setCovError] = useState<string | null>(null)

  // La zona del negocio puede llegar después del primer render.
  useResetOnChange([timezone, datesTouched], () => {
    if (!timezone || datesTouched) return
    const hoy = todayIso(timezone)
    setFrom(hoy)
    setTo(hoy)
  })
  useResetOnChange([timezone, covDatesTouched], () => {
    if (!timezone || covDatesTouched) return
    const hoy = todayIso(timezone)
    setCovFrom(hoy)
    setCovTo(hoy)
  })

  const effectiveTo = openEnded ? null : to
  const rangeValid =
    isValidIsoDate(from) && (openEnded || (isValidIsoDate(to) && to >= from))
  const partialValid = !partial || (isValidTime(startTime) && isValidTime(endTime) && endTime > startTime)
  const offAffected = useAffectedAppointments(
    rangeValid && partialValid
      ? {
          employeeId,
          dateFrom: from,
          dateTo: effectiveTo,
          startTime: partial ? startTime : null,
          endTime: partial ? endTime : null,
        }
      : null
  )

  const covValid = isValidIsoDate(covFrom) && isValidIsoDate(covTo) && covTo >= covFrom
  const covAffected = useAffectedAppointments(
    covValid ? { employeeId, dateFrom: covFrom, dateTo: covTo } : null
  )

  const offReviewing = rangeValid && partialValid && (offAffected.isLoading || offAffected.isFetching)
  const covReviewing = covValid && (covAffected.isLoading || covAffected.isFetching)

  const submitTimeOff = () => {
    setOffError(null)
    if (offReviewing) return
    if (!rangeValid) {
      return setOffError('Revisa las fechas (AAAA-MM-DD): el fin no puede ser anterior al inicio.')
    }
    if (partial && !partialValid) {
      return setOffError('Usa horas en formato HH:MM y que la de fin sea posterior al inicio.')
    }
    addTimeOff.mutate(
      {
        employee_id: employeeId,
        kind,
        date_from: from,
        date_to: effectiveTo,
        start_time: partial ? startTime : null,
        end_time: partial ? endTime : null,
        reason: reason.trim() || null,
        is_paid: null,
      },
      { onSuccess: () => setReason('') }
    )
  }

  const submitCoverage = () => {
    setCovError(null)
    if (covReviewing) return
    if (!covering) return setCovError(`Elige quién cubre a ${employeeName}.`)
    if (!covValid) {
      return setCovError('Revisa las fechas (AAAA-MM-DD): el fin no puede ser anterior al inicio.')
    }
    addCoverage.mutate(
      {
        covered_employee_id: employeeId,
        covering_employee_id: covering,
        date_from: covFrom,
        date_to: covTo,
        note: covNote.trim() || null,
      },
      { onSuccess: () => setCovNote('') }
    )
  }

  const myCoverages = (coverages.data ?? []).filter(
    (c) => c.covered_employee_id === employeeId || c.covering_employee_id === employeeId
  )

  const inputStyle = [
    av.input,
    { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundRoot },
  ]
  const cardStyle = [av.card, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]

  const chip = (label: string, active: boolean, onPress: () => void, key?: string) => (
    <Pressable
      key={key ?? label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        av.chip,
        {
          borderColor: active ? theme.primary : theme.border,
          backgroundColor: active ? `${theme.primary}22` : 'transparent',
        },
      ]}
    >
      <ThemedText type="small" style={{ color: active ? theme.primary : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  )

  const submitLabel = (reviewing: boolean, count: number, base: string) =>
    reviewing ? 'Revisando citas…' : count > 0 ? 'Guardar de todos modos' : base

  return (
    <ScrollView contentContainerStyle={av.content} keyboardShouldPersistTaps="handled">
      <ThemedText style={av.sectionTitle}>Ausencias</ThemedText>
      <View style={cardStyle}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          Motivo
        </ThemedText>
        <View style={av.chips}>
          {EMPLOYEE_TIME_OFF_KINDS.map((k) => chip(TIME_OFF_KIND_LABELS[k], kind === k, () => setKind(k), k))}
        </View>
        <View style={av.row}>
          <View style={av.grow}>
            <ThemedText style={[av.label, { color: theme.textMuted }]}>Desde (AAAA-MM-DD)</ThemedText>
            <TextInput
              value={from}
              onChangeText={(t) => {
                setDatesTouched(true)
                setFrom(t)
              }}
              placeholder="2026-10-24"
              placeholderTextColor={theme.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={inputStyle}
            />
          </View>
          <View style={av.grow}>
            <ThemedText style={[av.label, { color: theme.textMuted }]}>Hasta (AAAA-MM-DD)</ThemedText>
            <TextInput
              value={to}
              onChangeText={(t) => {
                setDatesTouched(true)
                setTo(t)
              }}
              placeholder="2026-10-24"
              placeholderTextColor={theme.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              editable={!openEnded}
              style={[inputStyle, openEnded && { opacity: 0.5 }]}
            />
          </View>
        </View>
        <View style={av.row}>
          <ThemedText style={av.grow}>Hasta nuevo aviso</ThemedText>
          <Switch
            value={openEnded}
            onValueChange={setOpenEnded}
            trackColor={{ false: theme.border, true: `${theme.primary}88` }}
            thumbColor={openEnded ? theme.primary : theme.textMuted}
          />
        </View>
        <View style={av.row}>
          <ThemedText style={av.grow}>Solo un horario del día (turno)</ThemedText>
          <Switch
            value={partial}
            onValueChange={setPartial}
            trackColor={{ false: theme.border, true: `${theme.primary}88` }}
            thumbColor={partial ? theme.primary : theme.textMuted}
          />
        </View>
        {partial && (
          <View style={av.row}>
            <View style={av.grow}>
              <ThemedText style={[av.label, { color: theme.textMuted }]}>Desde la hora</ThemedText>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={theme.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={inputStyle}
              />
            </View>
            <View style={av.grow}>
              <ThemedText style={[av.label, { color: theme.textMuted }]}>Hasta la hora</ThemedText>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="13:00"
                placeholderTextColor={theme.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={inputStyle}
              />
            </View>
          </View>
        )}
        <View>
          <ThemedText style={[av.label, { color: theme.textMuted }]}>Nota (opcional)</ThemedText>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholderTextColor={theme.textMuted}
            style={inputStyle}
          />
        </View>
        <AffectedList items={offAffected.data ?? []} />
        {offError && <AvailabilityNote kind="error">{offError}</AvailabilityNote>}
        {addTimeOff.error && (
          <AvailabilityNote kind="error">{(addTimeOff.error as Error).message}</AvailabilityNote>
        )}
        <Pressable
          style={[
            av.primaryBtn,
            { backgroundColor: theme.primary, opacity: addTimeOff.isPending || offReviewing ? 0.6 : 1 },
          ]}
          disabled={addTimeOff.isPending || offReviewing}
          onPress={submitTimeOff}
        >
          {(addTimeOff.isPending || offReviewing) && <ActivityIndicator color={theme.buttonText} />}
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>
            {submitLabel(offReviewing, offAffected.data?.length ?? 0, 'Guardar ausencia')}
          </ThemedText>
        </Pressable>
      </View>

      {timeOff.isLoading ? (
        <ActivityIndicator color={theme.primary} />
      ) : timeOff.isError ? (
        <AvailabilityNote kind="error">No se pudieron cargar las ausencias.</AvailabilityNote>
      ) : (timeOff.data ?? []).length === 0 ? (
        <AvailabilityNote kind="info">{`${staffSingular} no tiene ausencias registradas.`}</AvailabilityNote>
      ) : (
        (timeOff.data ?? []).map((t) => (
          <View key={t.id} style={[cardStyle, av.row]}>
            <View style={av.grow}>
              <ThemedText style={av.title}>{TIME_OFF_KIND_LABELS[t.kind]}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {rangeLabel(t.date_from, t.date_to)}
                {t.start_time && t.end_time ? ` · ${trimTime(t.start_time)}–${trimTime(t.end_time)}` : ''}
              </ThemedText>
              {t.reason ? (
                <ThemedText type="small" style={{ color: theme.textMuted }} numberOfLines={1}>
                  {t.reason}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Eliminar ausencia"
              style={[av.iconBtn, { borderColor: theme.border }]}
              onPress={() =>
                confirmDelete('¿Eliminar esta ausencia?', 'Los horarios vuelven a estar disponibles.', () =>
                  delTimeOff.mutate(t.id)
                )
              }
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          </View>
        ))
      )}

      {coverages.isError && (
        <AvailabilityNote kind="error">No se pudieron cargar las coberturas.</AvailabilityNote>
      )}
      <ThemedText style={av.sectionTitle}>Coberturas</ThemedText>
      <ThemedText type="small" style={{ color: theme.textMuted }}>
        {`Quien cubre hereda todos los servicios de ${employeeName} esos días, y ${employeeName} no recibe citas.`}
      </ThemedText>
      <View style={cardStyle}>
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          Quién cubre
        </ThemedText>
        <View style={av.chips}>
          {others.map((o) => chip(o.name, covering === o.id, () => setCovering(o.id), o.id))}
        </View>
        <View style={av.row}>
          <View style={av.grow}>
            <ThemedText style={[av.label, { color: theme.textMuted }]}>Desde (AAAA-MM-DD)</ThemedText>
            <TextInput
              value={covFrom}
              onChangeText={(t) => {
                setCovDatesTouched(true)
                setCovFrom(t)
              }}
              placeholder="2026-10-24"
              placeholderTextColor={theme.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={inputStyle}
            />
          </View>
          <View style={av.grow}>
            <ThemedText style={[av.label, { color: theme.textMuted }]}>Hasta (AAAA-MM-DD)</ThemedText>
            <TextInput
              value={covTo}
              onChangeText={(t) => {
                setCovDatesTouched(true)
                setCovTo(t)
              }}
              placeholder="2026-10-24"
              placeholderTextColor={theme.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={inputStyle}
            />
          </View>
        </View>
        <View>
          <ThemedText style={[av.label, { color: theme.textMuted }]}>Nota (opcional)</ThemedText>
          <TextInput
            value={covNote}
            onChangeText={setCovNote}
            placeholderTextColor={theme.textMuted}
            style={inputStyle}
          />
        </View>
        <AffectedList items={covAffected.data ?? []} />
        {covError && <AvailabilityNote kind="error">{covError}</AvailabilityNote>}
        {addCoverage.error && (
          <AvailabilityNote kind="error">{(addCoverage.error as Error).message}</AvailabilityNote>
        )}
        <Pressable
          style={[
            av.primaryBtn,
            { backgroundColor: theme.primary, opacity: addCoverage.isPending || covReviewing ? 0.6 : 1 },
          ]}
          disabled={addCoverage.isPending || covReviewing}
          onPress={submitCoverage}
        >
          {(addCoverage.isPending || covReviewing) && <ActivityIndicator color={theme.buttonText} />}
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>
            {submitLabel(covReviewing, covAffected.data?.length ?? 0, 'Guardar cobertura')}
          </ThemedText>
        </Pressable>
      </View>

      {myCoverages.map((c) => (
        <View key={c.id} style={[cardStyle, av.row]}>
          <View style={av.grow}>
            <ThemedText style={av.title}>
              {names.get(c.covering_employee_id) ?? 'Profesional'} cubre a{' '}
              {names.get(c.covered_employee_id) ?? 'Profesional'}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {rangeLabel(c.date_from, c.date_to)}
            </ThemedText>
            {c.note ? (
              <ThemedText type="small" style={{ color: theme.textMuted }} numberOfLines={1}>
                {c.note}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel="Eliminar cobertura"
            style={[av.iconBtn, { borderColor: theme.border }]}
            onPress={() =>
              confirmDelete('¿Eliminar esta cobertura?', undefined, () => delCoverage.mutate(c.id))
            }
          >
            <Feather name="trash-2" size={18} color={theme.error} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}
