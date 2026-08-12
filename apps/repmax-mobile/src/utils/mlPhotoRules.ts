// ============================================================
// Reglas de foto MercadoLibre (listados) — validación local
// Fuente: developers.mercadolibre.com — trabajar-con-imagenes
// El bucket `repmax-products` limita a 5 MB (ML admite 10 MB).
// ============================================================

export const ML_PHOTO = {
  minPx: 500,
  idealPx: 1200,
  maxPx: 1920,
  maxBytes: 5 * 1024 * 1024,
  maxSlots: 6,
} as const;

export const PHOTO_SLOT_LABELS = [
  'Portada',
  'N. parte',
  'Ángulo 2',
  'Caja',
  'Detalle',
  'Extra',
] as const;

export interface DatosFoto {
  width: number;
  height: number;
  fileSize?: number | null;
  mimeType?: string | null;
}

export interface ChequeoFoto {
  id: 'tamano' | 'formato' | 'peso';
  ok: boolean;
  label: string;
}

export interface ResultadoValidacionFoto {
  ok: boolean;
  chequeos: ChequeoFoto[];
  mensajeError?: string;
}

const MIME_OK = new Set(['image/jpeg', 'image/jpg', 'image/png']);

function formatoOk(mimeType?: string | null): boolean {
  if (!mimeType) return true;
  return MIME_OK.has(mimeType.toLowerCase());
}

/** Evalúa una toma contra el mínimo que ML (y nuestro bucket) aceptan. */
export function evaluarFotoMl(datos: DatosFoto): ResultadoValidacionFoto {
  const lado = Math.min(datos.width, datos.height);
  const tamanoOk = lado >= ML_PHOTO.minPx;
  const mimeOk = formatoOk(datos.mimeType);
  const pesoOk = datos.fileSize == null || datos.fileSize <= ML_PHOTO.maxBytes;

  const chequeos: ChequeoFoto[] = [
    {
      id: 'tamano',
      ok: tamanoOk,
      label: tamanoOk
        ? lado >= ML_PHOTO.idealPx
          ? `Tamaño ${lado} px — listo para zoom`
          : `Tamaño ${lado} px — aceptable (ideal ${ML_PHOTO.idealPx})`
        : `Tamaño ${lado} px — muy chica (mínimo ${ML_PHOTO.minPx})`,
    },
    {
      id: 'formato',
      ok: mimeOk,
      label: mimeOk ? 'Formato JPG o PNG' : 'Formato no válido — usa JPG o PNG',
    },
    {
      id: 'peso',
      ok: pesoOk,
      label: pesoOk ? 'Peso dentro del límite' : 'Archivo mayor a 5 MB',
    },
  ];

  const ok = chequeos.every((c) => c.ok);
  let mensajeError: string | undefined;
  if (!tamanoOk) {
    mensajeError = `Mide ${lado} px. El mínimo de MercadoLibre es ${ML_PHOTO.minPx} px. Toma otra más cerca o con más resolución.`;
  } else if (!mimeOk) {
    mensajeError = 'ML solo acepta JPG o PNG. Cambia el formato y vuelve a intentar.';
  } else if (!pesoOk) {
    mensajeError = 'El archivo pesa más de 5 MB. Baja la calidad o recorta y toma otra vez.';
  }

  return { ok, chequeos, mensajeError };
}
