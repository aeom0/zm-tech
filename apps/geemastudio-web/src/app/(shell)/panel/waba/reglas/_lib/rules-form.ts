/** Formulario de reglas básicas (S5-5). No toca cupo ni medios de pago. */

export type BasicRulesForm = {
  weekdayOpen: string
  weekdayClose: string
  sundayOpen: string
  sundayClose: string
  slot00: boolean
  slot30: boolean
  sundayExtra: string
  fixedAmount: string
  sundayPercent: string
  requiresHistoryForRate: boolean
  staffByCategory: Record<string, string[]>
}

const HM = /^([01]?\d|2[0-3]):([0-5]\d)$/

function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function isHm(v: string): boolean {
  return HM.test(v.trim())
}

function toMinutes(v: string): number {
  const m = HM.exec(v.trim())
  if (!m) return Number.NaN
  return Number(m[1]) * 60 + Number(m[2])
}

function padHm(v: string): string {
  const m = HM.exec(v.trim())
  if (!m) return v.trim()
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

export function formFromRules(raw: unknown): BasicRulesForm {
  const rules = isPlain(raw) ? raw : {}
  const schedule = isPlain(rules.schedule) ? rules.schedule : {}
  const weekday = isPlain(schedule.weekday) ? schedule.weekday : {}
  const sunday = isPlain(schedule.sunday) ? schedule.sunday : {}
  const slotMinutes = Array.isArray(schedule.slotMinutes) ? schedule.slotMinutes : [0, 30]
  const extras = Array.isArray(schedule.sundayExtraSlots)
    ? schedule.sundayExtraSlots.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    : []
  const deposit = isPlain(rules.deposit) ? rules.deposit : {}
  const staff = isPlain(rules.staffByCategory) ? rules.staffByCategory : {}
  const staffByCategory: Record<string, string[]> = {}
  for (const [categoryId, ids] of Object.entries(staff)) {
    if (!Array.isArray(ids)) continue
    staffByCategory[categoryId] = ids.filter(
      (id): id is string => typeof id === 'string' && id.trim() !== ''
    )
  }
  const sundayPercent =
    typeof deposit.sundayRate === 'number' ? String(Math.round(deposit.sundayRate * 100)) : '20'
  return {
    weekdayOpen: typeof weekday.open === 'string' ? weekday.open : '10:00',
    weekdayClose: typeof weekday.close === 'string' ? weekday.close : '18:00',
    sundayOpen: typeof sunday.open === 'string' ? sunday.open : '',
    sundayClose: typeof sunday.close === 'string' ? sunday.close : '',
    slot00: slotMinutes.includes(0),
    slot30: slotMinutes.includes(30),
    sundayExtra: extras.join(', '),
    fixedAmount: typeof deposit.fixedAmount === 'number' ? String(deposit.fixedAmount) : '25',
    sundayPercent,
    requiresHistoryForRate: deposit.requiresHistoryForRate !== false,
    staffByCategory,
  }
}

export function validateBasicRules(form: BasicRulesForm): string | null {
  if (!isHm(form.weekdayOpen) || !isHm(form.weekdayClose)) {
    return 'El horario de lunes a sábado usa el formato HH:MM.'
  }
  if (toMinutes(form.weekdayOpen) >= toMinutes(form.weekdayClose)) {
    return 'La apertura de lunes a sábado tiene que ser antes del cierre.'
  }
  const sundayOpen = form.sundayOpen.trim()
  const sundayClose = form.sundayClose.trim()
  if ((sundayOpen && !sundayClose) || (!sundayOpen && sundayClose)) {
    return 'Si el domingo abre, completa apertura y cierre. Déjalos vacíos si no abre.'
  }
  if (sundayOpen && sundayClose) {
    if (!isHm(sundayOpen) || !isHm(sundayClose)) {
      return 'El horario del domingo usa el formato HH:MM.'
    }
    if (toMinutes(sundayOpen) >= toMinutes(sundayClose)) {
      return 'La apertura del domingo tiene que ser antes del cierre.'
    }
  }
  if (!form.slot00 && !form.slot30) {
    return 'Elige al menos un minuto de slot (:00 o :30).'
  }
  const extras = form.sundayExtra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (extras.some((slot) => !isHm(slot))) {
    return 'Los horarios extra del domingo van en HH:MM, separados por coma.'
  }
  const amount = Number(form.fixedAmount.replace(',', '.'))
  if (!Number.isFinite(amount) || amount < 0) {
    return 'El abono fijo tiene que ser un monto de 0 o más.'
  }
  const percent = Number(form.sundayPercent.replace(',', '.'))
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return 'El adelanto del domingo va de 0 a 100.'
  }
  return null
}

/** Parchea horario, depósito y staff. Conserva cupo, medios de pago y el resto. */
export function patchBasicRules(existing: unknown, form: BasicRulesForm): Record<string, unknown> {
  const base = isPlain(existing) ? { ...existing } : {}
  const prevDeposit = isPlain(base.deposit) ? base.deposit : {}
  const prevStaff = isPlain(base.staffByCategory) ? base.staffByCategory : {}
  const slotMinutes = [form.slot00 ? 0 : null, form.slot30 ? 30 : null].filter(
    (n): n is number => n !== null
  )
  const sundayOpen = form.sundayOpen.trim()
  const sundayClose = form.sundayClose.trim()
  const extras = form.sundayExtra
    .split(',')
    .map((s) => padHm(s.trim()))
    .filter(Boolean)
  const staffByCategory: Record<string, string[]> = {}
  for (const [categoryId, ids] of Object.entries(prevStaff)) {
    if (Array.isArray(ids)) {
      staffByCategory[categoryId] = ids.filter((id): id is string => typeof id === 'string')
    }
  }
  for (const [categoryId, ids] of Object.entries(form.staffByCategory)) {
    staffByCategory[categoryId] = [...ids]
  }
  return {
    ...base,
    schedule: {
      weekday: {
        open: padHm(form.weekdayOpen),
        close: padHm(form.weekdayClose),
      },
      sunday: sundayOpen
        ? { open: padHm(sundayOpen), close: padHm(sundayClose) }
        : { open: '', close: '' },
      slotMinutes,
      sundayExtraSlots: extras,
    },
    deposit: {
      ...prevDeposit,
      fixedAmount: Number(form.fixedAmount.replace(',', '.')),
      sundayRate: Number(form.sundayPercent.replace(',', '.')) / 100,
      requiresHistoryForRate: form.requiresHistoryForRate,
    },
    staffByCategory,
  }
}
