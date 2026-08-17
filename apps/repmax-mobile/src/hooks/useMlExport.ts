// ============================================================
// Hook — export CSV catálogo ML (plan 05 E3)
// ============================================================
import { useCallback, useMemo, useState } from 'react';

import type { Product } from '../types/database';
import { mlListingService } from '../services/mercadolibre/mlListingService';
import {
  construirCsvExport,
  filtrarListosParaExport,
  type FilaExportMl,
} from '../services/mercadolibre/mlExportCsv';
import { evaluarListoMl } from '../utils/mlReadiness';
import { uriPortada } from '../utils/productPhotos';

export function useMlExport(products: Product[], onExported?: () => void) {
  const [isExporting, setIsExporting] = useState(false);

  const filas: FilaExportMl[] = useMemo(() => {
    return products.map((product) => {
      const portada = uriPortada(product.photos);
      const listo = evaluarListoMl({
        title: product.title,
        partNumber: product.partNumber ?? '',
        description: product.description,
        priceUsd: product.priceUsd,
        stock: product.stock,
        portadaUri: portada,
      }).listo;
      return { product, listo };
    });
  }, [products]);

  const listosParaExport = useMemo(() => {
    return filtrarListosParaExport(filas).filter(
      (f) =>
        !f.product.mlListingStatus ||
        f.product.mlListingStatus === 'ready' ||
        f.product.mlListingStatus === 'draft',
    );
  }, [filas]);

  const exportar = useCallback(async (): Promise<{ ok: true; count: number } | { ok: false; message: string }> => {
    if (listosParaExport.length === 0) {
      return {
        ok: false,
        message: 'No hay productos listos para exportar. Marca “Incluir en catálogo ML” y completa el checklist.',
      };
    }

    setIsExporting(true);
    try {
      const csv = construirCsvExport(listosParaExport);
      // Import dinámico: expo-file-system no está en el APK preview viejo hasta nuevo build.
      const { compartirCsvExport } = await import('../services/mercadolibre/mlExportShare');
      await compartirCsvExport(csv);
      const ids = listosParaExport.map((f) => f.product.id);
      await mlListingService.markExportedBatch(ids);
      onExported?.();
      return { ok: true, count: ids.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo exportar el catálogo.';
      return { ok: false, message };
    } finally {
      setIsExporting(false);
    }
  }, [listosParaExport, onExported]);

  return {
    isExporting,
    listosCount: listosParaExport.length,
    exportar,
  };
}
