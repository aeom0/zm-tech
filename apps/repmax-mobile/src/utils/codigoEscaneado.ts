// ============================================================
// Normaliza payloads de código de barras / QR para lookup de productos
// ============================================================

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Recorte estable: espacios, cero-width y saltos del scanner. */
export function normalizarCodigo(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

export function barcodeParaGuardar(valor: string): string | null {
  const t = normalizarCodigo(valor);
  return t.length > 0 ? t : null;
}

/**
 * Extrae UUID de producto si el QR es interno:
 * `repmax:{uuid}`, URL de vitrina `/p/{uuid}`, o el UUID solo.
 */
export function extraerIdProductoDeCodigo(raw: string): string | null {
  const texto = normalizarCodigo(raw);
  if (!texto) return null;

  const prefijo = texto.match(/^repmax:([0-9a-f-]{36})$/i);
  if (prefijo?.[1] && UUID_RE.test(prefijo[1])) {
    return prefijo[1].toLowerCase();
  }

  const enUrl = texto.match(/\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (enUrl?.[1] && UUID_RE.test(enUrl[1])) {
    return enUrl[1].toLowerCase();
  }

  if (UUID_RE.test(texto)) return texto.toLowerCase();
  return null;
}

export function esErrorBarcodeDuplicado(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('uniq_repmax_products_store_barcode');
}
