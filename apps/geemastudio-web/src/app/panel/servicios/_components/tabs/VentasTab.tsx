'use client'

import { Check, ShoppingBag, Truck, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  useCreateProductOrder,
  useMarkProductOrderPaid,
  useProductOrders,
  useProductos,
  useUpdateProductOrderStatus,
  type PaymentMethod,
  type ProductOrder,
  type ProductOrderSource,
} from '@/hooks/servicios/useProductos'

import { ProductoVentaModal } from '../ventas/ProductoVentaModal'

const STATUS_LABELS: Record<ProductOrder['status'], string> = {
  reserved: 'Apartado',
  pedido: 'Pedido',
  paid: 'Pagado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  yape_plin: 'Yape / Plin',
  transfer: 'Transferencia',
  card: 'Tarjeta',
}

export function VentasTab() {
  const productsQuery = useProductos()
  const ordersQuery = useProductOrders()
  const createOrder = useCreateProductOrder()
  const markPaid = useMarkProductOrderPaid()
  const updateStatus = useUpdateProductOrderStatus()
  const [saleOpen, setSaleOpen] = useState(false)
  const [paying, setPaying] = useState<ProductOrder | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openOrders = useMemo(
    () =>
      (ordersQuery.data ?? []).filter(
        (order) => order.status === 'reserved' || order.status === 'pedido'
      ).length,
    [ordersQuery.data]
  )

  async function handleCreate(input: {
    inventory_item_id: string
    quantity: number
    unit_price: number
    client_name: string
    client_phone: string
    source: ProductOrderSource
    notes: string
  }) {
    try {
      setError(null)
      await createOrder.mutateAsync(input)
      setSaleOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el apartado')
    }
  }

  async function handlePay(method: PaymentMethod) {
    if (!paying) return
    try {
      setError(null)
      await markPaid.mutateAsync({ orderId: paying.id, method })
      setPaying(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el pago')
    }
  }

  async function handleStatus(orderId: string, status: 'delivered' | 'cancelled') {
    try {
      setError(null)
      await updateStatus.mutateAsync({ orderId, status })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la venta')
    }
  }

  const orders = ordersQuery.data ?? []
  const products = productsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/60">
            {openOrders
              ? `${openOrders} venta${openOrders === 1 ? '' : 's'} por cerrar`
              : 'Sin ventas pendientes'}
          </p>
          <p className="mt-1 text-xs text-white/35">
            Registra apartados y cobra sin crear una cita.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSaleOpen(true)}
          disabled={products.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="h-4 w-4" />
          Nuevo apartado
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      {ordersQuery.isLoading ? (
        <div className="py-10 text-center text-sm text-white/40">Cargando ventas…</div>
      ) : ordersQuery.error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          No se pudieron cargar las ventas.
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-12 text-center text-sm text-white/35">
          Todavía no hay apartados ni pedidos.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <ul className="divide-y divide-white/[0.06]">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onPay={() => setPaying(order)}
                onDeliver={() => void handleStatus(order.id, 'delivered')}
                onCancel={() => void handleStatus(order.id, 'cancelled')}
              />
            ))}
          </ul>
        </div>
      )}

      {saleOpen ? (
        <ProductoVentaModal
          products={products}
          busy={createOrder.isPending}
          onClose={() => setSaleOpen(false)}
          onSave={(input) => void handleCreate(input)}
        />
      ) : null}

      {paying ? (
        <PaymentModal
          order={paying}
          busy={markPaid.isPending}
          onClose={() => setPaying(null)}
          onConfirm={(method) => void handlePay(method)}
        />
      ) : null}
    </div>
  )
}

function OrderRow({
  order,
  onPay,
  onDeliver,
  onCancel,
}: {
  order: ProductOrder
  onPay: () => void
  onDeliver: () => void
  onCancel: () => void
}) {
  const product = Array.isArray(order.inventory_items)
    ? order.inventory_items[0]?.name
    : order.inventory_items?.name
  const total = Number(order.unit_price) * order.quantity
  const open = order.status === 'reserved' || order.status === 'pedido'

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-white">
            {product ?? 'Producto'}{' '}
            <span className="font-normal text-white/50">×{order.quantity}</span>
          </p>
          <p className="mt-1 text-xs text-white/45">
            {order.client_name || 'Sin nombre'}
            {order.client_phone ? ` · ${order.client_phone}` : ''} · S/ {total.toFixed(2)}
          </p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-white/65">
          {STATUS_LABELS[order.status]}
        </span>
      </div>
      {open ? (
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={onPay} primary icon={<Check className="h-3.5 w-3.5" />}>
            Marcar pagado
          </ActionButton>
          <ActionButton onClick={onCancel} icon={<X className="h-3.5 w-3.5" />}>
            Cancelar
          </ActionButton>
        </div>
      ) : null}
      {order.status === 'paid' ? (
        <ActionButton onClick={onDeliver} icon={<Truck className="h-3.5 w-3.5" />}>
          Marcar entregado
        </ActionButton>
      ) : null}
    </li>
  )
}

function ActionButton({
  children,
  onClick,
  icon,
  primary = false,
}: {
  children: React.ReactNode
  onClick: () => void
  icon: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
        primary
          ? 'bg-[var(--tenant-primary)] text-white hover:bg-[var(--tenant-primary-hover)]'
          : 'border border-white/10 text-white/65 hover:bg-white/[0.05] hover:text-white',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  )
}

function PaymentModal({
  order,
  busy,
  onClose,
  onConfirm,
}: {
  order: ProductOrder
  busy: boolean
  onClose: () => void
  onConfirm: (method: PaymentMethod) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('yape_plin')
  const product = Array.isArray(order.inventory_items)
    ? order.inventory_items[0]?.name
    : order.inventory_items?.name

  return (
    <Modal title="Registrar pago" onClose={onClose}>
      <p className="mb-4 text-sm text-white/65">
        {product ?? 'Producto'} · {order.client_name || 'Clienta'} · S/{' '}
        {(Number(order.unit_price) * order.quantity).toFixed(2)}
      </p>
      <label className="block text-xs text-white/50">
        Método
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((key) => (
            <option key={key} value={key}>
              {METHOD_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <ModalActions
        busy={busy}
        onClose={onClose}
        onConfirm={() => onConfirm(method)}
        confirmLabel="Confirmar pago"
      />
    </Modal>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a1d26] p-5 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalActions({
  busy,
  onClose,
  onConfirm,
  confirmLabel,
}: {
  busy: boolean
  onClose: () => void
  onConfirm: () => void
  confirmLabel: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-white/50">
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? 'Registrando…' : confirmLabel}
      </button>
    </div>
  )
}
