import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput } from 'react-native'
import {
  FDI_TEETH,
  TOOTH_CONDITIONS,
  TOOTH_CONDITIONS_BY_ID,
  SURFACE_SELECTOR_OPTIONS,
  conditionFillColor,
  conditionStrokeColor,
  type FdiToothNumber,
  type OdontogramState,
  type OdontogramToothState,
  type ToothConditionId,
  type ActiveSurfaceSelection,
} from '@odentalpro/dental-schema'

import { ToothComponent } from './ToothComponent'

/**
 * Columnas del odontograma en orientación "vista del odontólogo" (FDI):
 * cuadrante 1 a la izquierda de la pantalla. Superior e inferior comparten
 * columna (18 sobre 48, 11 sobre 41, etc.), como en la ficha clínica en
 * papel y en la referencia de Dentalink.
 */
const UPPER_ROW: FdiToothNumber[] = [
  '18',
  '17',
  '16',
  '15',
  '14',
  '13',
  '12',
  '11',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
]
const LOWER_ROW: FdiToothNumber[] = [
  '48',
  '47',
  '46',
  '45',
  '44',
  '43',
  '42',
  '41',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
]
const COLUMNS = UPPER_ROW.map((u, i) => [u, LOWER_ROW[i]] as [FdiToothNumber, FdiToothNumber])

const ALL_SURFACES: Array<'mesial' | 'distal' | 'occlusal' | 'buccal' | 'palatal'> = [
  'mesial',
  'distal',
  'occlusal',
  'buccal',
  'palatal',
]

export function createEmptyOdontogram(): OdontogramState {
  const now = new Date().toISOString()
  const state: OdontogramState = {}
  for (const n of FDI_TEETH) {
    state[n] = { condition: null, surfaces: {}, lastUpdated: now }
  }
  return state
}

function emptyTooth(): OdontogramToothState {
  return { condition: null, surfaces: {}, lastUpdated: new Date().toISOString() }
}

export type OdontogramViewProps = {
  value?: OdontogramState
  onChange?: (next: OdontogramState) => void
  /** false = ficha paciente (solo lectura) */
  editable?: boolean
  title?: string
}

/**
 * Odontograma completo FDI (32 dientes). Sin persistencia — controlado por
 * props. Flujo de edición: elegir superficie activa + condición activa
 * (barras de abajo), luego tocar el diente. El toque aplica la condición
 * completa (no depende de acertar una zona geométrica precisa dentro del
 * diente), lo que la hace confiable tanto en mouse como en touch.
 */
export function OdontogramView({
  value,
  onChange,
  editable = false,
  title = 'Odontograma',
}: OdontogramViewProps) {
  const [internal, setInternal] = useState<OdontogramState>(() => value ?? createEmptyOdontogram())
  const [selected, setSelected] = useState<FdiToothNumber | null>(null)
  const [activeSurface, setActiveSurface] = useState<ActiveSurfaceSelection>('all')
  const [activeCondition, setActiveCondition] = useState<ToothConditionId>('healthy')

  const state = value ?? internal
  const activeDef = TOOTH_CONDITIONS_BY_ID[activeCondition]

  const commit = useCallback(
    (next: OdontogramState) => {
      if (value === undefined) setInternal(next)
      onChange?.(next)
    },
    [onChange, value]
  )

  const patchTooth = useCallback(
    (number: FdiToothNumber, patch: Partial<OdontogramToothState>) => {
      const prev = state[number] ?? emptyTooth()
      commit({
        ...state,
        [number]: {
          ...prev,
          ...patch,
          lastUpdated: new Date().toISOString(),
        },
      })
    },
    [commit, state]
  )

  const onPressTooth = useCallback(
    (number: FdiToothNumber) => {
      setSelected(number)
      if (!editable) return
      const prev = state[number] ?? emptyTooth()

      if (activeDef.resets) {
        patchTooth(number, { condition: null, surfaces: {}, notes: undefined })
        return
      }

      if (activeDef.layer === 'surface') {
        if (activeSurface === 'all') {
          const surfaces = Object.fromEntries(ALL_SURFACES.map((s) => [s, activeCondition]))
          patchTooth(number, { surfaces })
        } else {
          patchTooth(number, {
            surfaces: { ...prev.surfaces, [activeSurface]: activeCondition },
          })
        }
        return
      }

      // Condición de corona o raíz: aplica a la pieza completa, ignora la
      // superficie activa.
      patchTooth(number, {
        condition: activeCondition,
        notes: activeDef.freeform ? (prev.notes ?? '') : prev.notes,
      })
    },
    [activeCondition, activeDef, activeSurface, editable, patchTooth, state]
  )

  const onLongPressTooth = useCallback(
    (number: FdiToothNumber) => {
      if (!editable) return
      setSelected(number)
      patchTooth(number, { condition: null, surfaces: {}, notes: undefined })
    },
    [editable, patchTooth]
  )

  const selectedState = selected ? state[selected] : undefined
  const selectedNeedsNote =
    editable &&
    selected &&
    selectedState?.condition &&
    TOOTH_CONDITIONS_BY_ID[selectedState.condition]?.freeform

  const renderColumn = ([upper, lower]: [FdiToothNumber, FdiToothNumber]) => (
    <View key={upper} style={styles.column}>
      <ToothComponent
        number={upper}
        state={state[upper] ?? emptyTooth()}
        editable={editable}
        selected={selected === upper}
        onPressTooth={onPressTooth}
        onLongPressTooth={onLongPressTooth}
      />
      <Text style={[styles.toothNumber, selected === upper && styles.toothNumberActive]}>
        {upper}
      </Text>
      <Text style={[styles.toothNumber, selected === lower && styles.toothNumberActive]}>
        {lower}
      </Text>
      <ToothComponent
        number={lower}
        state={state[lower] ?? emptyTooth()}
        editable={editable}
        selected={selected === lower}
        onPressTooth={onPressTooth}
        onLongPressTooth={onLongPressTooth}
      />
    </View>
  )

  const surfaceSelector = editable ? (
    <View style={styles.selectorRow}>
      {SURFACE_SELECTOR_OPTIONS.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => setActiveSurface(opt.id)}
          style={[styles.chip, activeSurface === opt.id && styles.chipActive]}
        >
          <Text style={[styles.chipText, activeSurface === opt.id && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  ) : null

  const conditionPalette = useMemo(
    () =>
      TOOTH_CONDITIONS.map((c) => {
        const active = activeCondition === c.id
        const alarm = conditionStrokeColor(c)
        return (
          <Pressable
            key={c.id}
            onPress={() => editable && setActiveCondition(c.id)}
            style={[styles.condChip, active && styles.condChipActive]}
            disabled={!editable}
          >
            <View
              style={[
                styles.condSwatch,
                { backgroundColor: conditionFillColor(c) },
                alarm
                  ? { borderColor: alarm, borderWidth: 2 }
                  : c.color === '#0f172a' && { borderColor: '#475569' },
              ]}
            >
              {c.badge ? <Text style={styles.condBadge}>{c.badge}</Text> : null}
            </View>
            <Text style={[styles.condLabel, active && styles.condLabelActive]}>{c.label}</Text>
          </Pressable>
        )
      }),
    [activeCondition, editable]
  )

  return (
    <ScrollView
      horizontal={false}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{title}</Text>
      {editable ? (
        <Text style={styles.hint}>
          Elige superficie y condición abajo, luego toca el diente · mantén presionado para resetear
          a sano
        </Text>
      ) : (
        <Text style={styles.hint}>Solo lectura</Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContent}
      >
        <View style={styles.chartRow}>
          {COLUMNS.slice(0, 8).map(renderColumn)}
          <View style={styles.midline} />
          {COLUMNS.slice(8).map(renderColumn)}
        </View>
      </ScrollView>

      {editable ? (
        <>
          <Text style={styles.sectionLabel}>Superficie activa</Text>
          {surfaceSelector}

          <Text style={styles.sectionLabel}>Condición activa</Text>
          <View style={styles.condGrid}>{conditionPalette}</View>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Leyenda</Text>
          <View style={styles.condGrid}>{conditionPalette}</View>
        </>
      )}

      {selectedNeedsNote ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Nota — diente {selected}</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Describe la condición…"
            placeholderTextColor="#64748b"
            value={selectedState?.notes ?? ''}
            onChangeText={(text) => selected && patchTooth(selected, { notes: text })}
            multiline
          />
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    color: '#f0f4f8',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 16,
  },
  chartContent: {
    paddingVertical: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  column: {
    alignItems: 'center',
    gap: 2,
  },
  midline: {
    width: 2,
    alignSelf: 'stretch',
    marginHorizontal: 5,
    backgroundColor: 'rgba(13, 148, 136, 0.35)',
    borderRadius: 1,
  },
  toothNumber: {
    fontSize: 10,
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  toothNumberActive: {
    color: '#2dd4bf',
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1a2332',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#0d9488',
    borderColor: '#2dd4bf',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#f0fdfa',
    fontWeight: '600',
  },
  condGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  condChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: '45%',
  },
  condChipActive: {
    borderColor: '#2dd4bf',
    backgroundColor: '#0f2e2b',
  },
  condSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  condBadge: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0f172a',
  },
  condLabel: {
    color: '#94a3b8',
    fontSize: 11,
    flexShrink: 1,
  },
  condLabelActive: {
    color: '#f0fdfa',
    fontWeight: '600',
  },
  noteBox: {
    marginTop: 20,
  },
  noteLabel: {
    color: '#2dd4bf',
    fontSize: 12,
    marginBottom: 6,
  },
  noteInput: {
    minHeight: 60,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f0f4f8',
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
})
