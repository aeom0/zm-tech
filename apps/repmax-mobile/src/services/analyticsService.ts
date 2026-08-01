import { supabase } from '../utils/supabase';

export interface DashboardKPIs {
  salesToday: number;
  revenueToday: number;
  totalProducts: number;
  totalCustomers: number;
}

export const analyticsService = {
  async getDashboard(): Promise<DashboardKPIs> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Ejecutar las 4 queries en paralelo
    const [salesRes, productsRes, customersRes] = await Promise.all([
      supabase
        .from('sales')
        .select('total_usd')
        .eq('status', 'COMPLETED')
        .gte('created_at', todayISO),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true }),
    ]);

    const salesToday = salesRes.data?.length ?? 0;
    const revenueToday = (salesRes.data ?? []).reduce(
      (sum, s) => sum + parseFloat(s.total_usd ?? '0'), 0
    );

    return {
      salesToday,
      revenueToday,
      totalProducts: productsRes.count ?? 0,
      totalCustomers: customersRes.count ?? 0,
    };
  },
};
