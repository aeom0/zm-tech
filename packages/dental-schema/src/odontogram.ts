/**
 * Odontograma — tipos y catálogo clínico compartidos (mobile + web + backend).
 *
 * Numeración FDI/ISO 3950 (11-18, 21-28, 31-38, 41-48), orientación "vista
 * del odontólogo": el cuadrante 1 (superior derecho del paciente) se
 * dibuja a la izquierda de la pantalla. Es el estándar en Venezuela y en
 * toda Latinoamérica — no hay variante local distinta (verificado).
 */

export type ToothSurface = 'mesial' | 'distal' | 'occlusal' | 'buccal' | 'palatal'

/** Numeración FDI: 11–18, 21–28, 31–38, 41–48 */
export const FDI_TEETH = [
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
] as const

export type FdiToothNumber = (typeof FDI_TEETH)[number]

/**
 * Dónde se dibuja una condición dentro del diente en 3 capas:
 * - "surface": en el anillo de superficies (mapa mesial/distal/vestibular/
 *   palatino/oclusal) — caries, restauraciones, sellantes.
 * - "crown": en la corona — condiciones visibles de la pieza completa
 *   (corona protésica, fractura, extracción indicada, provisional).
 * - "root": en la raíz — condiciones radiculares/protésicas (endodoncia,
 *   perno, implante, póntico, ausencia).
 */
export type ConditionLayer = 'surface' | 'crown' | 'root'

/** "good"/"bad" controla el render: el relleno siempre es el color de material (así se sigue viendo QUÉ es), y "bad" agrega un contorno rojo de alarma (así se ve que está mal). Regla tomada de la referencia clínica (Dentalink pinta resina desadaptada como aqua con borde rojo, no como rojo sólido). "neutral" no aplica contorno. */
export type ConditionQuality = 'good' | 'bad' | 'neutral'

export type ConditionCategory =
  | 'estado' // sano / ausente / otros
  | 'patologia' // caries, fractura
  | 'restauracion' // resina, amalgama, sellante
  | 'protesis' // corona, perno, póntico
  | 'endodoncia'
  | 'implante'
  | 'cirugia' // extracción indicada

export interface ToothConditionDef {
  id: string
  label: string
  /** Texto corto (1-3 caracteres) para el badge dentro del ícono del diente. */
  badge?: string
  layer: ConditionLayer
  quality: ConditionQuality
  /** Color de material (se usa tal cual si quality !== "bad"; si quality === "bad" se sobreescribe por BAD_CONDITION_COLOR). */
  color: string
  category: ConditionCategory
  /** Si es true, seleccionar esta condición y tocar un diente lo resetea (limpia condición de corona/raíz y todas las superficies) en vez de asignarla. */
  resets?: boolean
  /** Condición de texto libre — la UI debe pedir una nota al aplicarla. */
  freeform?: boolean
}

/** Color de alarma universal para variantes "malas"/"desadaptadas" — se antepone al color de material del catálogo. */
export const BAD_CONDITION_COLOR = '#ef4444'

/**
 * Catálogo clínico. Config extensible: para agregar una condición nueva
 * basta con añadir una entrada aquí — ningún componente necesita tocarse
 * (el color/badge/capa ya son suficientes para renderizarla).
 */
const TOOTH_CONDITIONS_SOURCE = [
  {
    id: 'healthy',
    label: 'Diente sano',
    badge: '✓',
    layer: 'crown',
    quality: 'neutral',
    color: '#22c55e',
    category: 'estado',
    resets: true,
  },
  {
    id: 'caries',
    label: 'Caries',
    layer: 'surface',
    quality: 'bad',
    color: '#ef4444',
    category: 'patologia',
  },
  {
    id: 'resin-good',
    label: 'Resina adaptada',
    layer: 'surface',
    quality: 'good',
    color: '#2dd4bf',
    category: 'restauracion',
  },
  {
    id: 'resin-bad',
    label: 'Resina desadaptada',
    layer: 'surface',
    quality: 'bad',
    color: '#2dd4bf',
    category: 'restauracion',
  },
  {
    id: 'amalgam-good',
    label: 'Amalgama adaptada',
    layer: 'surface',
    quality: 'good',
    color: '#1e3a8a',
    category: 'restauracion',
  },
  {
    id: 'amalgam-bad',
    label: 'Amalgama desadaptada',
    layer: 'surface',
    quality: 'bad',
    color: '#1e3a8a',
    category: 'restauracion',
  },
  {
    id: 'sealant-good',
    label: 'Sellante bueno',
    badge: 'S',
    layer: 'surface',
    quality: 'good',
    color: '#7c3aed',
    category: 'restauracion',
  },
  {
    id: 'sealant-bad',
    label: 'Sellante desadaptado',
    badge: 'S',
    layer: 'surface',
    quality: 'bad',
    color: '#7c3aed',
    category: 'restauracion',
  },
  {
    id: 'crown-good',
    label: 'Corona buena',
    badge: 'C',
    layer: 'crown',
    quality: 'good',
    color: '#2563eb',
    category: 'protesis',
  },
  {
    id: 'crown-bad',
    label: 'Corona desadaptada',
    badge: 'C',
    layer: 'crown',
    quality: 'bad',
    color: '#2563eb',
    category: 'protesis',
  },
  {
    id: 'endo-good',
    label: 'Endodoncia buena',
    badge: 'E',
    layer: 'root',
    quality: 'good',
    color: '#2dd4bf',
    category: 'endodoncia',
  },
  {
    id: 'endo-bad',
    label: 'Endodoncia mala',
    badge: 'E',
    layer: 'root',
    quality: 'bad',
    color: '#2dd4bf',
    category: 'endodoncia',
  },
  {
    id: 'implant-good',
    label: 'Implante bueno',
    badge: 'I',
    layer: 'root',
    quality: 'good',
    color: '#0d9488',
    category: 'implante',
  },
  {
    id: 'implant-bad',
    label: 'Implante malo',
    badge: 'I',
    layer: 'root',
    quality: 'bad',
    color: '#0d9488',
    category: 'implante',
  },
  {
    id: 'post-good',
    label: 'Perno bueno',
    badge: 'Pn',
    layer: 'root',
    quality: 'good',
    color: '#3b82f6',
    category: 'protesis',
  },
  {
    id: 'post-bad',
    label: 'Perno malo',
    badge: 'Pn',
    layer: 'root',
    quality: 'bad',
    color: '#3b82f6',
    category: 'protesis',
  },
  {
    id: 'pontic',
    label: 'Póntico',
    badge: 'Po',
    layer: 'root',
    quality: 'neutral',
    color: '#eab308',
    category: 'protesis',
  },
  {
    id: 'fracture',
    label: 'Fractura',
    badge: 'Fx',
    layer: 'crown',
    quality: 'bad',
    color: '#ef4444',
    category: 'patologia',
  },
  {
    id: 'missing',
    label: 'Diente ausente',
    layer: 'root',
    quality: 'neutral',
    color: '#ef4444',
    category: 'estado',
  },
  {
    id: 'extraction-indicated',
    label: 'Extracción indicada',
    badge: 'X',
    layer: 'crown',
    quality: 'bad',
    color: '#ef4444',
    category: 'cirugia',
  },
  {
    id: 'provisional',
    label: 'Provisional',
    badge: 'Pr',
    layer: 'crown',
    quality: 'neutral',
    color: '#eab308',
    category: 'estado',
  },
  {
    id: 'other',
    label: 'Otros',
    badge: '*',
    layer: 'crown',
    quality: 'neutral',
    color: '#94a3b8',
    category: 'estado',
    freeform: true,
  },
] as const satisfies readonly ToothConditionDef[]

/** Unión literal de IDs — agregar una condición al catálogo la incorpora automáticamente al tipo. */
export type ToothConditionId = (typeof TOOTH_CONDITIONS_SOURCE)[number]['id']

export const TOOTH_CONDITIONS: readonly (ToothConditionDef & {
  id: ToothConditionId
})[] = TOOTH_CONDITIONS_SOURCE

export const TOOTH_CONDITIONS_BY_ID: Record<string, ToothConditionDef> = Object.fromEntries(
  TOOTH_CONDITIONS.map((c) => [c.id, c])
)

/** Relleno: siempre el color de material — una amalgama desadaptada sigue viéndose azul. */
export function conditionFillColor(condition: ToothConditionDef): string {
  return condition.color
}

/** Contorno de alarma: rojo si la condición es "bad", null si no lleva contorno especial. */
export function conditionStrokeColor(condition: ToothConditionDef): string | null {
  return condition.quality === 'bad' ? BAD_CONDITION_COLOR : null
}

/** Superficie activa en el selector global. "all" aplica a las 5 superficies (o resetea la pieza si la condición no es de superficie). */
export type ActiveSurfaceSelection = ToothSurface | 'all'

export const SURFACE_SELECTOR_OPTIONS: { id: ActiveSurfaceSelection; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'buccal', label: 'Vestibular' },
  { id: 'occlusal', label: 'Oclusal-Incisal' },
  { id: 'palatal', label: 'Lingual-Palatina' },
  { id: 'mesial', label: 'Mesial' },
  { id: 'distal', label: 'Distal' },
]

export type OdontogramToothState = {
  /** Condición de capa "crown" o "root" vigente para la pieza completa (una sola a la vez). null = sin condición asignada en esas capas. */
  condition: ToothConditionId | null
  /** Condiciones de capa "surface", una por superficie. */
  surfaces: Partial<Record<ToothSurface, ToothConditionId>>
  /** Nota libre — obligatoria si `condition` tiene freeform:true (p.ej. "other"). */
  notes?: string
  lastUpdated: string
}

/** Snapshot por visita — cada clinical_record guarda su propia foto */
export type OdontogramState = Record<string, OdontogramToothState>
