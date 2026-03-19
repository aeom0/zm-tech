import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Devuelve los conteos de badges para el tab Más y sus items.
 * Solo activo para roles admin (dev / owner).
 * Se refresca automáticamente cada 60 segundos.
 */
export function usePendingBadgeCount() {
  const { isAdmin } = useAuth();

  // Citas con pago enviado pendiente de validación
  const { data: paymentValidationCount = 0 } = useQuery<number>({
    queryKey: ['badges', 'payment_submitted'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'payment_submitted');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    refetchInterval: 60_000,
    enabled: isAdmin,
  });

  // Citas SIN profesional asignado en los próximos 7 días (hacia adelante)
  const { data: unassignedCount = 0 } = useQuery<number>({
    queryKey: ['badges', 'unassigned_next_7_days'],
    queryFn: async () => {
      const now = new Date();
      const end = new Date();
      end.setDate(now.getDate() + 7);
      const { count, error } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .gte('date', now.toISOString())
        .lt('date', end.toISOString())
        .neq('status', 'cancelled')
        .is('employee_id', null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    refetchInterval: 60_000,
    enabled: isAdmin,
  });

  // Badge total del tab = solo pagos pendientes
  // (unassignedCount es informacional en el item, no suma al tab)
  const tabBadgeCount = paymentValidationCount;

  return {
    paymentValidationCount,
    unassignedCount,
    tabBadgeCount,
  };
}
