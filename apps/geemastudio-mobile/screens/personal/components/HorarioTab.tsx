import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { WEEK_DAYS, trimTime } from '@geemastudio/shared-schema'

import { ThemedText } from '@/components/ThemedText'
import { useResetOnChange } from '@/hooks/useResetOnChange'
import { useTheme } from '@/hooks/useTheme'

import {
  useBookingLeadDays,
  useSaveBookingLeadDays,
  useSaveWorkShifts,
  useWorkShifts,
} from '../hooks/useAvailability'
import { isValidTime } from '../lib/availabilityUi'
import { AvailabilityNote } from './AvailabilityNote'
import { av } from './availabilityStyles'

interface Shift {
  start: string
  end: string
}
type Week = Record<number, Shift[]>

const DEFAULT_SHIFT: Shift = { start: '09:00', end: '18:00' }

/** Suma minutos a HH:MM sin pasar de 23:59. */
function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = Math.min((h ?? 0) * 60 + (m ?? 0) + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** El turno nuevo arranca cuando termina el último, para no solaparse. */
function nextShift(shifts: Shift[]): Shift {
  if (shifts.length === 0) return { ...DEFAULT_SHIFT }
  const start = [...shifts].sort((a, b) => a.end.localeCompare(b.end)).at(-1)?.end ?? '09:00'
  const end = addMinutes(start, 240)
  if (end <= start) return { start: '18:00', end: '22:00' }
  return { start, end }
}

function emptyWeek(): Week {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
}

function validate(week: Week): string | null {
  for (const d of WEEK_DAYS) {
    const shifts = [...(week[d.weekday] ?? [])].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 0; i < shifts.length; i++) {
      const s = shifts[i]!
      if (!isValidTime(s.start) || !isValidTime(s.end)) {
        return `${d.label}: usa el formato HH:MM (por ejemplo 13:00).`
      }
      if (s.end <= s.start) return `${d.label}: la hora de fin debe ser posterior al inicio.`
      if (i > 0 && s.start < shifts[i - 1]!.end) return `${d.label}: los turnos se solapan.`
    }
  }
  return null
}

export function HorarioTab({
  employeeId,
  staffSingular,
}: {
  employeeId: string
  staffSingular: string
}) {
  const { theme } = useTheme()
  const query = useWorkShifts(employeeId)
  const leadQuery = useBookingLeadDays(employeeId)
  const save = useSaveWorkShifts(employeeId)
  const saveLead = useSaveBookingLeadDays(employeeId)
  const [custom, setCustom] = useState(false)
  const [week, setWeek] = useState<Week>(emptyWeek())
  const [leadDays, setLeadDays] = useState(0)
  const [saved, setSaved] = useState(false)

  useResetOnChange([query.data], () => {
    if (!query.data) return
    const w = emptyWeek()
    for (const r of query.data) {
      w[r.weekday]!.push({ start: trimTime(r.start_time), end: trimTime(r.end_time) })
    }
    setWeek(w)
    setCustom(query.data.length > 0)
  })

  useResetOnChange([leadQuery.data], () => {
    if (leadQuery.data === undefined) return
    setLeadDays(leadQuery.data)
  })

  const update = (weekday: number, next: Shift[]) => {
    setSaved(false)
    setWeek((prev) => ({ ...prev, [weekday]: next }))
  }

  const enableCustom = (on: boolean) => {
    setSaved(false)
    setCustom(on)
    if (on && WEEK_DAYS.every((d) => (week[d.weekday] ?? []).length === 0)) {
      const w = emptyWeek()
      for (const d of WEEK_DAYS) if (d.weekday !== 0) w[d.weekday] = [{ ...DEFAULT_SHIFT }]
      setWeek(w)
    }
  }

  const copyToAll = (from: number) => {
    setSaved(false)
    setWeek((prev) => {
      const next = emptyWeek()
      for (const d of WEEK_DAYS) next[d.weekday] = (prev[from] ?? []).map((s) => ({ ...s }))
      return next
    })
  }

  if (query.isLoading || leadQuery.isLoading) {
    return <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} />
  }
  if (query.isError || !query.data || leadQuery.isError || leadQuery.data === undefined) {
    return (
      <AvailabilityNote kind="error">
        No se pudo cargar el horario. Recarga antes de guardar, para no borrar los turnos.
      </AvailabilityNote>
    )
  }

  const error = custom ? validate(week) : null
  const noShifts = custom && WEEK_DAYS.every((d) => (week[d.weekday] ?? []).length === 0)

  const submit = () => {
    const shifts = custom
      ? WEEK_DAYS.flatMap((d) =>
          (week[d.weekday] ?? []).map((s) => ({
            weekday: d.weekday,
            start_time: s.start,
            end_time: s.end,
          }))
        )
      : []
    save.mutate(shifts, {
      onSuccess: () => {
        saveLead.mutate(leadDays, { onSuccess: () => setSaved(true) })
      },
    })
  }

  const pending = save.isPending || saveLead.isPending
  const changeLead = (next: number) => {
    setSaved(false)
    setLeadDays(Math.min(30, Math.max(0, next)))
  }

  const inputStyle = [
    av.input,
    av.grow,
    { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundRoot },
  ]

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={av.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            av.card,
            av.row,
            { borderColor: theme.border, backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={av.grow}>
            <ThemedText style={av.title}>Usa el horario del negocio</ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted }}>
              {`Desactívalo para definir los días y turnos de ${staffSingular.toLowerCase()}.`}
            </ThemedText>
          </View>
          <Switch
            value={!custom}
            onValueChange={(v) => enableCustom(!v)}
            trackColor={{ false: theme.border, true: `${theme.primary}88` }}
            thumbColor={!custom ? theme.primary : theme.textMuted}
          />
        </View>

        {custom &&
          WEEK_DAYS.map((d) => {
            const shifts = week[d.weekday] ?? []
            return (
              <View
                key={d.weekday}
                style={[
                  av.card,
                  { borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                ]}
              >
                <View style={av.row}>
                  <ThemedText style={[av.title, av.grow]}>{d.label}</ThemedText>
                  {shifts.length > 0 && (
                    <Pressable
                      onPress={() => copyToAll(d.weekday)}
                      accessibilityLabel={`Copiar el horario del ${d.label.toLowerCase()} a los demás días`}
                      style={[av.iconBtn, { borderColor: theme.border }]}
                    >
                      <Feather name="copy" size={18} color={theme.textSecondary} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => update(d.weekday, [...shifts, nextShift(shifts)])}
                    accessibilityLabel={`Agregar turno el ${d.label.toLowerCase()}`}
                    style={[av.iconBtn, { borderColor: theme.border }]}
                  >
                    <Feather name="plus" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
                {shifts.length === 0 ? (
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    No trabaja este día.
                  </ThemedText>
                ) : (
                  shifts.map((s, i) => (
                    <View key={i} style={av.row}>
                      <TextInput
                        value={s.start}
                        onChangeText={(t) =>
                          update(
                            d.weekday,
                            shifts.map((x, j) => (j === i ? { ...x, start: t } : x))
                          )
                        }
                        placeholder="09:00"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        accessibilityLabel="Inicio del turno"
                        style={inputStyle}
                      />
                      <ThemedText style={{ color: theme.textMuted }}>a</ThemedText>
                      <TextInput
                        value={s.end}
                        onChangeText={(t) =>
                          update(
                            d.weekday,
                            shifts.map((x, j) => (j === i ? { ...x, end: t } : x))
                          )
                        }
                        placeholder="18:00"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                        accessibilityLabel="Fin del turno"
                        style={inputStyle}
                      />
                      <Pressable
                        onPress={() =>
                          update(
                            d.weekday,
                            shifts.filter((_, j) => j !== i)
                          )
                        }
                        accessibilityLabel="Quitar turno"
                        style={[av.iconBtn, { borderColor: theme.border }]}
                      >
                        <Feather name="trash-2" size={18} color={theme.error} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )
          })}

        {noShifts && (
          <AvailabilityNote kind="warning">
            {`Agrega al menos un turno, o vuelve a usar el horario del negocio. Guardar sin turnos borraría el horario de ${staffSingular.toLowerCase()}.`}
          </AvailabilityNote>
        )}
        {error && <AvailabilityNote kind="error">{error}</AvailabilityNote>}
        {save.error && (
          <AvailabilityNote kind="error">{(save.error as Error).message}</AvailabilityNote>
        )}
        {saveLead.error && (
          <AvailabilityNote kind="error">{(saveLead.error as Error).message}</AvailabilityNote>
        )}

        <View
          style={[av.card, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText style={av.title}>Días de aviso para citas nuevas</ThemedText>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            0 permite agendar hoy. 1, desde mañana. Al asignar a mano se puede elegir igual.
          </ThemedText>
          <View style={av.row}>
            <Pressable
              onPress={() => changeLead(leadDays - 1)}
              disabled={leadDays <= 0}
              accessibilityLabel="Restar un día de aviso"
              style={[av.iconBtn, { borderColor: theme.border, opacity: leadDays <= 0 ? 0.4 : 1 }]}
            >
              <Feather name="minus" size={18} color={theme.textSecondary} />
            </Pressable>
            <ThemedText style={[av.title, { minWidth: 28, textAlign: 'center' }]}>
              {leadDays}
            </ThemedText>
            <Pressable
              onPress={() => changeLead(leadDays + 1)}
              disabled={leadDays >= 30}
              accessibilityLabel="Sumar un día de aviso"
              style={[av.iconBtn, { borderColor: theme.border, opacity: leadDays >= 30 ? 0.4 : 1 }]}
            >
              <Feather name="plus" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <View style={av.footer}>
        <Pressable
          style={[
            av.primaryBtn,
            { backgroundColor: theme.primary, opacity: pending || error || noShifts ? 0.6 : 1 },
          ]}
          disabled={pending || !!error || noShifts}
          onPress={submit}
        >
          {pending ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <Feather name={saved ? 'check' : 'save'} size={18} color={theme.buttonText} />
          )}
          <ThemedText style={{ color: theme.buttonText, fontWeight: '600' }}>
            {saved ? 'Guardado' : 'Guardar horario'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  )
}
