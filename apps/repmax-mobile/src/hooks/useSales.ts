import { useState, useCallback } from 'react';
import { saleService } from '../services/saleService';
import type { Sale, CashSession } from '../types/database';

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSales = useCallback(async (sessionId?: string) => {
    try {
      setIsLoading(true);
      const data = await saleService.getAll(sessionId);
      setSales(data);
    } catch {
      setError('Error al cargar ventas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActiveSession = useCallback(async () => {
    try {
      const session = await saleService.getActiveSession();
      setActiveSession(session);
      return session;
    } catch {
      return null;
    }
  }, []);

  return { sales, activeSession, isLoading, error, loadSales, loadActiveSession };
}
