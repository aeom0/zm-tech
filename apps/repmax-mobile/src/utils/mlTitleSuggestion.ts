// Título sugerido para MercadoLibre — plan 04 fase B / plan 05 E2.
// Formato: Producto + Marca + compatible con {modelo} {años}

function formatearRangoAnios(yearFrom?: number | string, yearTo?: number | string): string {
  const desde = typeof yearFrom === 'string' ? parseInt(yearFrom, 10) : yearFrom;
  const hasta = typeof yearTo === 'string' ? parseInt(yearTo, 10) : yearTo;
  if (desde && hasta && desde !== hasta) return `${desde}-${hasta}`;
  if (desde) return String(desde);
  if (hasta) return String(hasta);
  return '';
}

export interface SugerenciaTituloMlInput {
  /** Nombre del producto / tipo de pieza (título corto sin compatibilidad). */
  nombreProducto: string;
  brand: string;
  model: string;
  yearFrom?: number | string;
  yearTo?: number | string;
}

/** Devuelve null si faltan datos mínimos para armar el título. */
export function sugerirTituloMl(input: SugerenciaTituloMlInput): string | null {
  const producto = input.nombreProducto.trim();
  const marca = input.brand.trim();
  const modelo = input.model.trim();
  if (!producto || !marca || !modelo) return null;

  const years = formatearRangoAnios(input.yearFrom, input.yearTo);
  const base = `${producto} ${marca} compatible con ${modelo}`;
  return years ? `${base} ${years}` : base;
}
