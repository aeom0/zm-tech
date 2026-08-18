const MESES: Record<string, number> = {
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
}

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
}

function parseHora(texto: string): { hora: number; min: number } | null {
  const t = texto.toLowerCase().trim()
  const amPm = t.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i)
  if (amPm) {
    let h = parseInt(amPm[1], 10)
    const m = amPm[2] ? parseInt(amPm[2], 10) : 0
    if (amPm[3].toLowerCase().startsWith('p') && h < 12) h += 12
    if (amPm[3].toLowerCase().startsWith('a') && h === 12) h = 0
    return { hora: h, min: m }
  }
  const hhmm = t.match(/(\d{1,2}):(\d{2})/)
  if (hhmm) return { hora: parseInt(hhmm[1], 10), min: parseInt(hhmm[2], 10) }
  const relativo = t.match(/(\d{1,2})\s+de\s+la\s+(mañana|tarde|noche)/)
  if (relativo) {
    let h = parseInt(relativo[1], 10)
    if (relativo[2] === 'tarde' || relativo[2] === 'noche') {
      if (h < 12) h += 12
    } else if (relativo[2] === 'mañana' && h === 12) h = 0
    return { hora: h, min: 0 }
  }
  const soloHora = t.match(/^(\d{1,2})\s*$/)
  if (soloHora) {
    const h = parseInt(soloHora[1], 10)
    if (h >= 8 && h <= 19) return { hora: h, min: 0 }
    if (h < 8) return { hora: h + 12, min: 0 }
    return { hora: h, min: 0 }
  }
  return null
}

function parseFecha(texto: string, ref: Date): { año: number; mes: number; dia: number } | null {
  const t = texto.toLowerCase().trim().replace(/\s+/g, ' ')
  const hoy = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  if (t === 'mañana' || t === 'manana') {
    const d = new Date(hoy)
    d.setDate(d.getDate() + 1)
    return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() }
  }
  if (t === 'pasado mañana' || t === 'pasado manana') {
    const d = new Date(hoy)
    d.setDate(d.getDate() + 2)
    return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() }
  }
  const diaDeMes = t.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)/)
  if (diaDeMes) {
    const dia = parseInt(diaDeMes[1], 10)
    const mesNombre = diaDeMes[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const mes = MESES[mesNombre] ?? MESES[diaDeMes[2]]
    if (mes !== undefined && dia >= 1 && dia <= 31) {
      let año = ref.getFullYear()
      const candidato = new Date(año, mes, dia)
      if (candidato < hoy) año += 1
      return { año, mes, dia }
    }
  }
  const diaSemanaNum = t.match(
    /(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})/
  )
  if (diaSemanaNum) {
    const diaSemanaEsperado = DIAS_SEMANA[diaSemanaNum[1]]
    const dia = parseInt(diaSemanaNum[2], 10)
    if (diaSemanaEsperado !== undefined && dia >= 1 && dia <= 31) {
      const año = ref.getFullYear()
      for (let m = 0; m < 12; m++) {
        const d = new Date(año, m, dia)
        if (d.getDate() === dia && d.getDay() === diaSemanaEsperado && d >= hoy)
          return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() }
      }
      for (let m = 0; m < 12; m++) {
        const d = new Date(año + 1, m, dia)
        if (d.getDate() === dia && d.getDay() === diaSemanaEsperado)
          return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() }
      }
    }
  }
  const proxDia = t.match(
    /(pr[oó]ximo|este|el)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/
  )
  if (proxDia) {
    const diaSemana = DIAS_SEMANA[proxDia[2]]
    if (diaSemana !== undefined) {
      const d = new Date(hoy)
      let diff = diaSemana - d.getDay()
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() + diff)
      return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() }
    }
  }
  const soloDia = t.match(/^(\d{1,2})$/)
  if (soloDia) {
    const dia = parseInt(soloDia[1], 10)
    if (dia >= 1 && dia <= 31) {
      let año = ref.getFullYear()
      let mes = ref.getMonth()
      const candidato = new Date(año, mes, dia)
      if (candidato < hoy) {
        mes += 1
        if (mes > 11) {
          mes = 0
          año += 1
        }
      }
      return { año, mes, dia }
    }
  }
  return null
}

export interface ParseResult {
  date: Date
  formatted: string
}

export function parseDatetimeES(texto: string, refDate?: Date): ParseResult | null {
  const ref = refDate ?? new Date()
  const t = texto.trim()
  if (!t) return null
  let fecha: { año: number; mes: number; dia: number } | null = null
  let hora: { hora: number; min: number } = { hora: 9, min: 0 }
  const horaConPrefijo = t.match(
    /(?:a\s+las?|las?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?|\d{1,2}\s+de\s+la\s+(?:mañana|tarde|noche))/i
  )
  const horaSolo = t.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i)
  const horaCandidato = horaConPrefijo?.[1] ?? horaSolo?.[1]
  if (horaCandidato) {
    const h = parseHora(horaCandidato.trim())
    if (h) hora = h
  }
  const textoParaFecha = t
    .replace(/(?:a\s+las?|las?)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?/gi, '')
    .replace(/(?:a\s+las?|las?)\s+\d{1,2}\s+de\s+la\s+(?:mañana|tarde|noche)/gi, '')
    .trim()
  if (textoParaFecha) fecha = parseFecha(textoParaFecha, ref)
  if (!fecha && horaCandidato)
    fecha = { año: ref.getFullYear(), mes: ref.getMonth(), dia: ref.getDate() }
  if (!fecha) {
    const h = parseHora(t)
    if (h) {
      fecha = {
        año: ref.getFullYear(),
        mes: ref.getMonth(),
        dia: ref.getDate(),
      }
      hora = h
    }
  }
  if (!fecha) return null
  const date = new Date(Date.UTC(fecha.año, fecha.mes, fecha.dia, hora.hora + 5, hora.min, 0, 0))
  const formatted = date.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
  return { date, formatted }
}
