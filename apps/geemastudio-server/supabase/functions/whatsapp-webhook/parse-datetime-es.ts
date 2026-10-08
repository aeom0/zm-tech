/** Perú (Lima) = UTC-5. Duplicado de lib/constants.ts para evitar import circular. */
const LIMA_UTC_OFFSET_HOURS = 5;

/**
 * "Ahora" en hora Lima, como si fuera un Date UTC con los componentes de
 * calendario de Lima (mismo patrón que agenda.ts:207-213). Sin este ajuste,
 * un mensaje enviado entre las 19:00–23:59 Lima cae en el rango 00:00–04:59
 * UTC del día calendario SIGUIENTE — "mañana" calculaba un día de más
 * (caso Angie 14/15-ago: "mañana" a las 21:45 Lima viernes dio domingo en
 * vez de sábado).
 */
function limaNow(): Date {
  const nowUtc = new Date();
  return new Date(nowUtc.getTime() - LIMA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}

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
};

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
};

/** Colapsa alargues tipo "agostoooooo" → "agosto", "siiii" → "si". */
function collapseElongatedLetters(texto: string): string {
  return texto.replace(/([a-záéíóúñü])\1{2,}/gi, "$1");
}

function normalizeMonthToken(raw: string): string {
  return collapseElongatedLetters(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveMonthIndex(raw: string): number | undefined {
  const norm = normalizeMonthToken(raw);
  if (!norm) return undefined;
  if (MESES[norm] !== undefined) return MESES[norm];
  // Prefijo único ≥4 chars: "agost" → agosto (tras colapsar alargues raros)
  if (norm.length < 4) return undefined;
  const hits = Object.entries(MESES).filter(
    ([nombre]) =>
      nombre.length >= 4 &&
      (nombre.startsWith(norm) || norm.startsWith(nombre)),
  );
  if (hits.length === 1) return hits[0][1];
  return undefined;
}

function parseHora(texto: string): { hora: number; min: number } | null {
  const t = collapseElongatedLetters(texto.toLowerCase().trim());
  // "medio día" / "mediodia" / "al mediodía"
  if (/\b(?:al\s+)?medio\s*d[ií]a\b/.test(t) || /\bmediodia\b/.test(t)) {
    return { hora: 12, min: 0 };
  }
  const amPm = t.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = amPm[2] ? parseInt(amPm[2], 10) : 0;
    if (amPm[3].toLowerCase().startsWith("p") && h < 12) h += 12;
    if (amPm[3].toLowerCase().startsWith("a") && h === 12) h = 0;
    return { hora: h, min: m };
  }
  const hhmm = t.match(/(\d{1,2}):(\d{2})/);
  if (hhmm) {
    let h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    // Salón 10 AM–7 PM: "2:00" sin sufijo = 2 PM (igual que parseTimeSlot).
    if (h >= 1 && h <= 7) h += 12;
    return { hora: h, min: m };
  }
  const relativo = t.match(/(\d{1,2})\s+de\s+la\s+(mañana|tarde|noche)/);
  if (relativo) {
    let h = parseInt(relativo[1], 10);
    if (relativo[2] === "tarde" || relativo[2] === "noche") {
      if (h < 12) h += 12;
    } else if (relativo[2] === "mañana" && h === 12) h = 0;
    return { hora: h, min: 0 };
  }
  const soloHora = t.match(/^(\d{1,2})\s*$/);
  if (soloHora) {
    const h = parseInt(soloHora[1], 10);
    if (h >= 8 && h <= 19) return { hora: h, min: 0 };
    if (h < 8) return { hora: h + 12, min: 0 };
    return { hora: h, min: 0 };
  }
  return null;
}

function parseFecha(
  texto: string,
  ref: Date,
): { año: number; mes: number; dia: number } | null {
  const t = collapseElongatedLetters(texto.toLowerCase().trim()).replace(
    /\s+/g,
    " ",
  );
  const hoy = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const hoyParts = () => ({
    año: hoy.getFullYear(),
    mes: hoy.getMonth(),
    dia: hoy.getDate(),
  });
  // "hoy" / "hoy día" / "para hoy" — research 10-sep (LYM …5765). Mismo patrón
  // que mañana: exacto primero, luego embebido.
  if (
    t === "hoy" ||
    t === "para hoy" ||
    /^hoy(?:\s+d[ií]a)?[!?.…]*$/u.test(t)
  ) {
    return hoyParts();
  }
  // Si el mensaje también nombra un día de semana explícito ("hoy no podré
  // ir... resérvenme el sábado"), ese día manda — no "hoy" embebido en la
  // frase de cancelación. Sin este guard, "hoy" en "hoy no podré ir" ganaba
  // y se ofrecían horarios de HOY en vez de sábado (Maribel Merino, 21-sep).
  const nombraOtroDiaSemana =
    /(pr[oó]ximo|este|el)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/
      .test(
        t,
      );
  if (/\bhoy(?:\s+d[ií]a)?\b/.test(t) && !nombraOtroDiaSemana) {
    return hoyParts();
  }
  if (t === "mañana" || t === "manana") {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
  }
  if (t === "pasado mañana" || t === "pasado manana") {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
  }
  // "pasado mañana" embebida ("para pasado mañana", "pasado mañana por la tarde")
  // — debe ir ANTES del match amplio de "mañana" o resolvería +1 en vez de +2.
  if (/\bpasado\s+(mañana|manana)\b/.test(t)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
  }
  // "mañana" = día siguiente. Antes hay que quitar franjas horarias
  // ("en/de/por la mañana") — si no, "el sábado en la mañana" se leía
  // como mañana=tomorrow (Yelitza …1186, 16-sep: jueves en vez de sábado).
  const sinFranjaHoraria = t.replace(
    /(?:de|en|por)\s+la\s+(mañana|manana|tarde|noche)\b/g,
    " ",
  );
  if (/\b(mañana|manana)\b/.test(sinFranjaHoraria)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
  }

  const resolveYearForMonthDay = (mes: number, dia: number) => {
    let año = ref.getFullYear();
    const candidato = new Date(año, mes, dia);
    if (candidato < hoy) año += 1;
    return año;
  };

  // Disyunción "4 o 5" / "el 4 o el 5" / "en octubre el 4 o 5" / "4 o 5 de octubre"
  // — ANTES de diaDeMes: si no, `(\d)\s+(?:de\s+)?(\w+)` captura ("4","o") y falla
  // (María Elena …6497, research 10-sep). Sticky = primer día; sin botones.
  {
    const mesAntesOr = t.match(
      /(?:en\s+)?([a-záéíóúñ]+)\s+(?:el\s+)?(\d{1,2})\s+o\s+(?:el\s+)?(\d{1,2})\b/,
    );
    if (mesAntesOr) {
      const mes = resolveMonthIndex(mesAntesOr[1]);
      const dia = parseInt(mesAntesOr[2], 10);
      if (mes !== undefined && dia >= 1 && dia <= 31) {
        return { año: resolveYearForMonthDay(mes, dia), mes, dia };
      }
    }
    const orDeMes = t.match(
      /(\d{1,2})\s+o\s+(?:el\s+)?(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)/,
    );
    if (orDeMes) {
      const dia = parseInt(orDeMes[1], 10);
      const mes = resolveMonthIndex(orDeMes[3]);
      if (mes !== undefined && dia >= 1 && dia <= 31) {
        return { año: resolveYearForMonthDay(mes, dia), mes, dia };
      }
    }
    // Bare "el 4 o 5" / "4 o 5" — NO "3 o 4 días" (Lili reclamo).
    const orBare = t.match(
      /(?:^|\b)(?:el\s+)?(\d{1,2})\s+o\s+(?:el\s+)?(\d{1,2})\b(?!\s*(?:d[ií]as?|horas?|semanas?|meses?|minutos?|a[nñ]os?))/,
    );
    if (orBare) {
      const dia = parseInt(orBare[1], 10);
      if (dia >= 1 && dia <= 31) {
        let año = ref.getFullYear();
        let mes = ref.getMonth();
        const candidato = new Date(año, mes, dia);
        if (candidato < hoy) {
          mes += 1;
          if (mes > 11) {
            mes = 0;
            año += 1;
          }
        }
        return { año, mes, dia };
      }
    }
  }

  // Mes → día: "en octubre el 4" | "octubre 4" (complemento a día→mes).
  const mesLuegoDia = t.match(
    /(?:en\s+)?([a-záéíóúñ]+)\s+(?:el\s+)?(\d{1,2})\b/,
  );
  if (mesLuegoDia) {
    const mes = resolveMonthIndex(mesLuegoDia[1]);
    const dia = parseInt(mesLuegoDia[2], 10);
    if (mes !== undefined && dia >= 1 && dia <= 31) {
      return { año: resolveYearForMonthDay(mes, dia), mes, dia };
    }
  }

  // "15 de agosto" | "14 agosto" | "14 agostoooooo" (Pati Cavana 2026-07-20)
  const diaDeMes = t.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)/);
  if (diaDeMes) {
    const dia = parseInt(diaDeMes[1], 10);
    const mes = resolveMonthIndex(diaDeMes[2]);
    if (mes !== undefined && dia >= 1 && dia <= 31) {
      return { año: resolveYearForMonthDay(mes, dia), mes, dia };
    }
  }
  const diaSemanaNum = t.match(
    /(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})/,
  );
  if (diaSemanaNum) {
    const diaSemanaEsperado = DIAS_SEMANA[diaSemanaNum[1]];
    const dia = parseInt(diaSemanaNum[2], 10);
    if (diaSemanaEsperado !== undefined && dia >= 1 && dia <= 31) {
      const año = ref.getFullYear();
      for (let m = 0; m < 12; m++) {
        const d = new Date(año, m, dia);
        if (
          d.getDate() === dia && d.getDay() === diaSemanaEsperado && d >= hoy
        ) {
          return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
        }
      }
      for (let m = 0; m < 12; m++) {
        const d = new Date(año + 1, m, dia);
        if (d.getDate() === dia && d.getDay() === diaSemanaEsperado) {
          return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
        }
      }
    }
  }
  const proxDia = t.match(
    /(pr[oó]ximo|este|el)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/,
  );
  if (proxDia) {
    const diaSemana = DIAS_SEMANA[proxDia[2]];
    if (diaSemana !== undefined) {
      const d = new Date(hoy);
      let diff = diaSemana - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
    }
  }
  // Nombre de día suelto ("Sábado", "Domingo") — PE.…8419 / Smil …9843 (análisis 01/03-sep).
  // Mismo cálculo que "el próximo <día>"; solo si el mensaje completo es el nombre
  // (no "no domingo", no frases largas). Puntuación final opcional ("Sábado!").
  const bareWeekday = t
    .replace(/[!?.…]+$/u, "")
    .trim()
    .match(
      /^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)$/,
    );
  if (bareWeekday) {
    const diaSemana = DIAS_SEMANA[bareWeekday[1]];
    if (diaSemana !== undefined) {
      const d = new Date(hoy);
      let diff = diaSemana - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return { año: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
    }
  }
  const soloDia = t.match(/^(\d{1,2})$/);
  if (soloDia) {
    const dia = parseInt(soloDia[1], 10);
    if (dia >= 1 && dia <= 31) {
      let año = ref.getFullYear();
      let mes = ref.getMonth();
      const candidato = new Date(año, mes, dia);
      if (candidato < hoy) {
        mes += 1;
        if (mes > 11) {
          mes = 0;
          año += 1;
        }
      }
      return { año, mes, dia };
    }
  }
  return null;
}

export interface ParseResult {
  date: Date;
  formatted: string;
}

/** True si el mensaje trae hora explícita (no el día del mes). */
export function hasExplicitTime(texto: string): boolean {
  const t = collapseElongatedLetters(texto.toLowerCase().trim());
  if (/\b(?:al\s+)?medio\s*d[ií]a\b/.test(t) || /\bmediodia\b/.test(t)) {
    return true;
  }
  // (?!\w): "la 3D" / "la 4D" no es hora (Sayuri 09-sep-2026 → SLOT_TAKEN fantasma)
  if (
    /(?:a\s+las?|las?)\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm|a\.m\.|p\.m\.))?(?!\w)/i
      .test(
        t,
      )
  ) {
    return true;
  }
  if (/\d{1,2}:\d{2}/.test(t)) return true;
  if (/\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.)\b/i.test(t)) return true;
  if (/\d{1,2}\s+de\s+la\s+(?:mañana|tarde|noche)/i.test(t)) return true;
  return false;
}

/**
 * Solo día (ej. "el 15 de agosto", "mañana") → "YYYY-MM-DD" Lima.
 * Null si hay hora explícita o no se parsea fecha.
 */
export function parseDateOnlyKey(texto: string, refDate?: Date): string | null {
  if (!texto.trim() || hasExplicitTime(texto)) return null;
  const ref = refDate ?? limaNow();
  const fecha = parseFecha(
    collapseElongatedLetters(texto.trim().replace(/\s+/g, " ")),
    ref,
  );
  if (!fecha) return null;
  const mm = String(fecha.mes + 1).padStart(2, "0");
  const dd = String(fecha.dia).padStart(2, "0");
  return `${fecha.año}-${mm}-${dd}`;
}

export function parseDatetimeES(
  texto: string,
  refDate?: Date,
): ParseResult | null {
  const ref = refDate ?? limaNow();
  const t = collapseElongatedLetters(texto.trim());
  if (!t) return null;
  let fecha: { año: number; mes: number; dia: number } | null = null;
  let hora: { hora: number; min: number } = { hora: 9, min: 0 };
  // (?!\w) también en prefijo "la(s) N": evita "la 3D"/"la 4D" (Sayuri 09-sep).
  // am/pm va DENTRO del grupo antes del lookahead para no romper "a las 3pm".
  const horaConPrefijo = t.match(
    /(?:a\s+las?|las?)\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm|a\.m\.|p\.m\.))?(?!\w)|\d{1,2}\s+de\s+la\s+(?:mañana|tarde|noche))/i,
  );
  // Negative lookahead (?!\w): evita capturar "3d", "4D", "3rd" etc. como hora
  const horaSolo = t.match(
    /(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm|a\.m\.|p\.m\.))?(?!\w))/i,
  );
  // "15 de agosto" / "14 agosto" → el 15/14 es día, NO hora (Pati/Treysy)
  const diaDeMes = t.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)/i);
  const diaDeMesEsMes = !!diaDeMes &&
    resolveMonthIndex(diaDeMes[2]) !== undefined;
  let horaCandidato = horaConPrefijo?.[1] ?? undefined;
  if (!horaCandidato && horaSolo?.[1]) {
    const solo = horaSolo[1].trim();
    const soloEsDiaDelMes = diaDeMesEsMes &&
      solo === diaDeMes![1] &&
      !/(?:am|pm|a\.m\.|p\.m\.|:)/i.test(solo);
    // Número suelto sin am/pm/":" (sin marcador explícito de hora): solo se
    // interpreta como hora implícita si el mensaje es corto (≤4 palabras).
    // Un número suelto embebido en un mensaje largo (ej. reclamo/garantía
    // "...no se puede bajar solo en 3 o 4 días") NO debe leerse como hora
    // (caso Lili 04-ago-2026, cita fantasma creada por error).
    const esNumeroSueltoSinMarcador = /^\d{1,2}$/.test(solo);
    const wordCount = t.split(/\s+/).filter(Boolean).length;
    const esNumeroSueltoEnMensajeLargo = esNumeroSueltoSinMarcador &&
      wordCount > 4;
    if (!soloEsDiaDelMes && !esNumeroSueltoEnMensajeLargo) horaCandidato = solo;
  }
  // "medio día" sin número
  if (!horaCandidato && hasExplicitTime(t) && /\bmedio/.test(t.toLowerCase())) {
    horaCandidato = "medio dia";
  }
  if (horaCandidato) {
    const h = parseHora(horaCandidato.trim());
    if (h) hora = h;
  }
  const textoParaFecha = t
    .replace(
      /(?:a\s+las?|las?)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?/gi,
      "",
    )
    .replace(
      /(?:a\s+las?|las?)\s+\d{1,2}\s+de\s+la\s+(?:mañana|tarde|noche)/gi,
      "",
    )
    // Eliminar hora suelta con am/pm o HH:MM para que no confunda parseFecha
    .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.)?/gi, "")
    .replace(/\b\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, "")
    .replace(/\b(?:al\s+)?medio\s*d[ií]a\b/gi, "")
    .replace(/\bmediodia\b/gi, "")
    .trim();
  if (textoParaFecha) fecha = parseFecha(textoParaFecha, ref);
  if (!fecha && horaCandidato) {
    fecha = { año: ref.getFullYear(), mes: ref.getMonth(), dia: ref.getDate() };
  }
  if (!fecha) {
    const h = parseHora(t);
    if (h) {
      fecha = {
        año: ref.getFullYear(),
        mes: ref.getMonth(),
        dia: ref.getDate(),
      };
      hora = h;
    }
  }
  if (!fecha) return null;
  // Interpretar fecha/hora como Lima (UTC-5); el runtime Edge suele ser UTC
  const date = new Date(
    Date.UTC(fecha.año, fecha.mes, fecha.dia, hora.hora + 5, hora.min, 0, 0),
  );
  const formatted = date.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, formatted };
}
