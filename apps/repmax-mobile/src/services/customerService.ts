import { supabase } from '../utils/supabase';
import type { Customer } from '../types/database';

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    storeId: row.store_id,
    fullName: row.full_name,
    phone: row.phone,
    cedulaRif: row.cedula_rif,
    email: row.email,
    notes: row.notes,
    totalPurchases: row.total_purchases,
    totalSpentUsd: parseFloat(row.total_spent_usd ?? '0'),
    createdAt: row.created_at,
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
