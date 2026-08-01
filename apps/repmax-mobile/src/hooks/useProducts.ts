import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
import type { Product } from '../types/database';

export function useProducts(filters?: { q?: string; condition?: string; brand?: string; stock?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productService.getAll(filters);
      setProducts(data);
    } catch {
      setError('Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  return { products, isLoading, error, refetch: load };
}
