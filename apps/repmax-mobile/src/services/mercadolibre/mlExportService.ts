// ============================================================
// Export CSV para publicador masivo MercadoLibre (modo puente E3)
// ============================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { Product } from '../../types/database';
import { urisFotos } from '../../utils/productPhotos';

const MAX_FOTOS = 6;

export const ML_EXPORT_COLUMNS = [
  'repmax_id',
  'titulo',
  'descripcion',
  'marca',
  'modelo',
  'numero_parte',
  'color',
  'condicion',
  'anio_desde',
  'anio_hasta',
  'precio_usd',
  'stock',
  'ml_categoria_id',
  'ml_categoria_nombre',
  ...Array.from({ length: MAX_FOTOS }, (_, i) => `url_foto_${i + 1}`),
] as const;

function escaparCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

function condicionLabel(condition: Product['condition']): string {
  return condition === 'NEW' ? 'Nuevo' : 'Usado';
}

export interface FilaExportMl {
  product: Product;
  listo: boolean;
}

/** Filas listas para export (checklist OK + listing ready). */
export function filtrarListosParaExport(filas: FilaExportMl[]): FilaExportMl[] {
  return filas.filter((f) => f.listo && f.product.mlPublishIntent);
}

export function construirCsvExport(filas: FilaExportMl[]): string {
  const lineas: string[] = [ML_EXPORT_COLUMNS.join(',')];

  for (const { product } of filas) {
    const fotos = urisFotos(product.photos).slice(0, MAX_FOTOS);
    const celdas: string[] = [
      product.id,
      product.title,
      product.description ?? '',
      product.brand,
      product.model,
      product.partNumber ?? '',
      product.color ?? '',
      condicionLabel(product.condition),
      product.yearFrom != null ? String(product.yearFrom) : '',
      product.yearTo != null ? String(product.yearTo) : '',
      product.priceUsd.toFixed(2),
      String(product.stock),
      product.mlCategoryId ?? '',
      product.mlCategoryName ?? '',
      ...Array.from({ length: MAX_FOTOS }, (_, i) => fotos[i] ?? ''),
    ];
    lineas.push(celdas.map((c) => escaparCsv(c)).join(','));
  }

  return `\uFEFF${lineas.join('\n')}`;
}

export async function compartirCsvExport(contenido: string, nombreBase = 'repmax-ml'): Promise<void> {
  const nombre = `${nombreBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.cacheDirectory ?? ''}${nombre}`;

  await FileSystem.writeAsStringAsync(path, contenido, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const puedeCompartir = await Sharing.isAvailableAsync();
  if (!puedeCompartir) {
    throw new Error('Este dispositivo no permite compartir archivos. Copia el CSV desde otro canal.');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar catálogo ML',
    UTI: 'public.csv',
  });
}
