import { supabase } from '../utils/supabase';
import type { Customer } from '../types/database';

/** Fila snake_case de PostgREST (`repmax_customers`). */
interface CustomerRow {
  id: string;
  store_id: string;
  full_name: string;
  phone: string | null;
  cedula_rif: string | null;
  email: string | null;
  notes: string | null;
  total_purchases: number | null;
  total_spent_usd: string | number | null;
  created_at: string | null;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    storeId: row.store_id,
    fullName: row.full_name,
    phone: row.phone ?? undefined,
    cedulaRif: row.cedula_rif ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    totalPurchases: row.total_purchases ?? 0,
    totalSpentUsd: parseFloat(String(row.total_spent_usd ?? '0')),
    createdAt: row.created_at ?? '',
  };
}

export const customerService = {
  async getAll(q?: string): Promise<Customer[]> {
    let query = supabase
      .from('repmax_customers')
      .select('*')
      .order('full_name', { ascending: true });

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,cedula_rif.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCustomer);
  },

  /** Detalle individual — PostgREST por id (evita getAll + find). */
  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('repmax_customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapCustomer(data) : null;
  },

  async create(customer: Partial<Customer>): Promise<Customer> {
    const payload: Record<string, unknown> = {
      store_id: customer.storeId,
      full_name: customer.fullName,
      phone: customer.phone,
      cedula_rif: customer.cedulaRif,
      email: customer.email,
      notes: customer.notes,
    };

    const { data, error } = await supabase
      .from('repmax_customers')
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapCustomer(data);
  },
};
