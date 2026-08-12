// ============================================================
// Fotos de catálogo (Storage o URLs del seed). Independiente de ML.
// ============================================================

export function urisFotos(photos?: string[] | null): string[] {
  if (!Array.isArray(photos)) return [];
  return photos.filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
}

export function uriPortada(photos?: string[] | null): string | null {
  return urisFotos(photos)[0] ?? null;
}
