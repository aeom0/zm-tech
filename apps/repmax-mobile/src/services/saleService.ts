import { supabase } from '../utils/supabase'
import type { DetallesPago } from '@zmtech/tasas'
import type { Sale, CashSession, CartItem, PaymentMethod } from '../types/database'

interface CreateSaleParams {
  storeId: string
  cashierId: string
  sessionId?: string
  customerId?: string
  paymentMethod: PaymentMethod
  paymentDetails?: DetallesPago
  usdBsRate: number
  notes?: string
  items: CartItem[]
}

function mapCashSession(row: any): CashSession {
  return {
    id: row.id,
    storeId: row.store_id,
    cashierId: row.cashier_id,
    status: row.status,
    openingAmountUsd: parseFloat(row.opening_amount_usd ?? '0'),
    closingAmountUsd: row.closing_amount_usd ? parseFloat(row.closing_amount_usd) : undefined,
    totalSalesUsd: row.total_sales_usd ? parseFloat(row.total_sales_usd) : undefined,
    totalByPaymentMethod: row.total_by_payment_method ?? {},
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    notes: row.notes,
  }
}

function mapSale(row: any): Sale {
  return {
    id: row.id,
    storeId: row.store_id,
    sessionId: row.session_id,
    customerId: row.customer_id,
    cashierId: row.cashier_id,
    invoiceNumber: row.invoice_number,
    totalUsd: parseFloat(row.total_usd),
    totalBs: row.total_bs ? parseFloat(row.total_bs) : undefined,
    usdBsRate: row.usd_bs_rate ? parseFloat(row.usd_bs_rate) : undefined,
    paymentMethod: row.payment_method,
    paymentDetails: row.payment_details,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export const saleService = {
  async getAll(sessionId?: string): Promise<Sale[]> {
    let query = supabase.from('repmax_sales').select('*').order('created_at', { ascending: false })

    if (sessionId) query = query.eq('session_id', sessionId)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapSale)
  },

  // Crea una venta con sus items atómicamente usando el RPC de la DB
  async create(params: CreateSaleParams): Promise<string> {
    const items = params.items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price_usd: item.product.priceUsd,
      product_snapshot: item.product,
    }))

    const { data, error } = await supabase.rpc('repmax_create_sale_with_items', {
      p_store_id: params.storeId,
      p_session_id: params.sessionId ?? null,
      p_customer_id: params.customerId ?? null,
      p_cashier_id: params.cashierId,
      p_payment_method: params.paymentMethod,
      p_payment_details: params.paymentDetails ?? {},
      p_usd_bs_rate: params.usdBsRate,
      p_notes: params.notes ?? null,
      p_items: items,
    })

    if (error) throw new Error(error.message)
    return data as string // retorna el UUID de la venta creada
  },

  async getActiveSession(): Promise<CashSession | null> {
    const { data, error } = await supabase
      .from('repmax_cash_sessions')
      .select('*')
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? mapCashSession(data) : null
  },

  async openSession(
    storeId: string,
    cashierId: string,
    openingAmountUsd: number,
    notes?: string
  ): Promise<CashSession> {
    const { data, error } = await supabase
      .from('repmax_cash_sessions')
      .insert({
        store_id: storeId,
        cashier_id: cashierId,
        opening_amount_usd: openingAmountUsd,
        notes: notes ?? null,
        status: 'OPEN',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapCashSession(data)
  },

  async closeSession(
    sessionId: string,
    closingAmountUsd: number,
    notes?: string
  ): Promise<CashSession> {
    // Calcular totales de la sesión antes de cerrar
    const { data: salesData } = await supabase
      .from('repmax_sales')
      .select('total_usd, payment_method')
      .eq('session_id', sessionId)
      .eq('status', 'COMPLETED')

    const totalSalesUsd = (salesData ?? []).reduce(
      (sum, s) => sum + parseFloat(s.total_usd ?? '0'),
      0
    )

    const totalByPaymentMethod: Record<string, number> = {}
    for (const sale of salesData ?? []) {
      const method = sale.payment_method
      totalByPaymentMethod[method] =
        (totalByPaymentMethod[method] ?? 0) + parseFloat(sale.total_usd ?? '0')
    }

    const { data, error } = await supabase
      .from('repmax_cash_sessions')
      .update({
        status: 'CLOSED',
        closing_amount_usd: closingAmountUsd,
        total_sales_usd: totalSalesUsd,
        total_by_payment_method: totalByPaymentMethod,
        closed_at: new Date().toISOString(),
        notes: notes ?? null,
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return mapCashSession(data)
  },
}
