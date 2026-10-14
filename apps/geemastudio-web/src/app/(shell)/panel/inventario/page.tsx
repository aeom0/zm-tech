'use client'

import { useId, useMemo, useState } from 'react'
import {
  AlertTriangle,
  History,
  Minus,
  Package,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react'
import {
  isLowStock,
  mergeInventoryCategories,
  type InventoryCategoryOption,
  type InventoryItem,
  type InventoryMovement,
} from '@geemastudio/data'
import { formatoInstanteEnZona, zonaIANASegura } from '@zmtech/tenant-config'

import { FeatureAvailabilityNotice } from '@/components/plan/FeatureAvailabilityNotice'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { FilterChips } from '@/components/ui/FilterChips'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { StateNote } from '@/components/ui/StateNote'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import {
  useInventoryCategories,
  useInventoryItems,
  useInventoryMovements,
  useInventoryMutations,
} from '@/hooks/inventario/useInventory'
import { usePlan } from '@/hooks/plan/usePlan'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

const LOW_STOCK = '__low'

export default function PanelInventarioPage() {
  const { isAdmin, isLoading: authLoading, profile } = useAuth()
  const tenantId = profile?.tenant_id ?? null
  const { data: settings } = useTenantSettings()
  const { can } = usePlan()
  const { confirm, dialog } = useConfirm()

  const itemsQuery = useInventoryItems(tenantId)
  const movementsQuery = useInventoryMovements(tenantId)
  const categoriesQuery = useInventoryCategories(tenantId)
  const mutations = useInventoryMutations(tenantId)

  const currencyCode = settings?.currency_code ?? 'USD'
  const timeZone = zonaIANASegura(settings?.timezone)

  const categories = useMemo(
    () => mergeInventoryCategories(settings?.business_type ?? '', categoriesQuery.data ?? []),
    [settings?.business_type, categoriesQuery.data]
  )
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const lowStock = useMemo(() => items.filter(isLowStock), [items])

  const [tab, setTab] = useState<string | null>(null)
  const selected = tab ?? categories[0]?.key ?? ''
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible =
    selected === LOW_STOCK ? lowStock : items.filter((item) => item.category === selected)
  const selectedCategory = categories.find((c) => c.key === selected)

  const adjust = (item: InventoryItem, delta: number) => {
    if (delta < 0 && Number(item.quantity) <= 0) return
    setAdjustingId(item.id)
    setError(null)
    mutations.adjust.mutate(
      { id: item.id, delta },
      { onError: (e) => setError(e.message), onSettled: () => setAdjustingId(null) }
    )
  }

  const removeItem = async (item: InventoryItem) => {
    const ok = await confirm({
      title: 'Eliminar producto',
      description: `Se elimina "${item.name}". Sus movimientos quedan en el historial.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return
    setError(null)
    mutations.remove.mutate(item.id, { onError: (e) => setError(e.message) })
  }

  const removeCategory = async (cat: InventoryCategoryOption) => {
    if (!cat.id) return
    const ok = await confirm({
      title: 'Eliminar categoría',
      description: `¿Eliminar "${cat.label}"? Solo se puede si no tiene productos.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return
    setError(null)
    mutations.deleteCategory.mutate(
      { id: cat.id, key: cat.key },
      {
        onError: (e) => setError(e.message),
        onSuccess: () => setTab(null),
      }
    )
  }

  if (!authLoading && !isAdmin) {
    return <StateNote kind="warning">Solo el dueño del negocio puede ver el inventario.</StateNote>
  }

  const chipOptions = [
    ...categories.map((c) => ({
      id: c.key,
      label: c.label,
      count: items.filter((i) => i.category === c.key).length || undefined,
    })),
    ...(lowStock.length > 0
      ? [{ id: LOW_STOCK, label: 'Stock bajo', count: lowStock.length, color: '#d97706' }]
      : []),
  ]

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Inventario"
        description="Productos e insumos del salón, con aviso cuando el stock está bajo."
        actions={
          <>
            <Button icon={<Tag className="h-4 w-4" />} onClick={() => setIsCategoryModalOpen(true)}>
              Categoría
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setEditing('new')}
              disabled={!tenantId || categories.length === 0}
            >
              Producto
            </Button>
          </>
        }
      />

      <FeatureAvailabilityNotice
        feature="inventory"
        label="el inventario"
        included={can('inventory')}
      />

      {lowStock.length > 0 && selected !== LOW_STOCK && (
        <button
          type="button"
          onClick={() => setTab(LOW_STOCK)}
          className="flex w-full items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-800 transition hover:bg-amber-500/15 dark:text-amber-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>{lowStock.length}</strong>{' '}
            {lowStock.length === 1 ? 'producto está' : 'productos están'} en el mínimo o por debajo.
            Ver cuáles
          </span>
        </button>
      )}

      <FilterChips
        ariaLabel="Categoría de inventario"
        options={chipOptions}
        value={selected}
        onChange={setTab}
        scroll
      />

      {selectedCategory?.isCustom && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void removeCategory(selectedCategory)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-fg-muted hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Eliminar categoría «{selectedCategory.label}»
          </button>
        </div>
      )}

      <FormError message={error} />

      {itemsQuery.isLoading || !tenantId ? (
        <StateNote kind="loading">Cargando inventario…</StateNote>
      ) : itemsQuery.error ? (
        <StateNote kind="error">{(itemsQuery.error as Error).message}</StateNote>
      ) : visible.length === 0 ? (
        <StateNote
          kind="empty"
          icon={<Package className="h-5 w-5" />}
          action={
            selected !== LOW_STOCK ? (
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
                Agregar producto
              </Button>
            ) : undefined
          }
        >
          {selected === LOW_STOCK
            ? 'Ningún producto está en stock bajo.'
            : `Aún no hay productos en ${selectedCategory?.label ?? 'esta categoría'}.`}
        </StateNote>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categoryLabel={
                selected === LOW_STOCK
                  ? categories.find((c) => c.key === item.category)?.label
                  : undefined
              }
              currencyCode={currencyCode}
              busy={adjustingId === item.id}
              onAdjust={(delta) => adjust(item, delta)}
              onEdit={() => setEditing(item)}
              onDelete={() => void removeItem(item)}
            />
          ))}
        </ul>
      )}

      <MovementList movements={movementsQuery.data ?? []} items={items} timeZone={timeZone} />

      {editing && (
        <ItemModal
          item={editing === 'new' ? null : editing}
          categories={categories}
          defaultCategory={selected === LOW_STOCK ? (categories[0]?.key ?? '') : selected}
          onClose={() => setEditing(null)}
          onSubmit={(input) =>
            mutations.save.mutateAsync({ id: editing === 'new' ? undefined : editing.id, input })
          }
        />
      )}

      {isCategoryModalOpen && (
        <CategoryModal
          onClose={() => setIsCategoryModalOpen(false)}
          onSubmit={async (label) => {
            await mutations.createCategory.mutateAsync({ label, sortOrder: categories.length })
          }}
        />
      )}

      {dialog}
    </div>
  )
}

function ItemCard({
  item,
  categoryLabel,
  currencyCode,
  busy,
  onAdjust,
  onEdit,
  onDelete,
}: {
  item: InventoryItem
  categoryLabel?: string
  currencyCode: string
  busy: boolean
  onAdjust: (delta: number) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const low = isLowStock(item)
  const cost = item.cost != null && item.cost !== '' ? Number(item.cost) : null

  return (
    <li
      className={[
        'flex flex-col gap-3 rounded-2xl border bg-surface p-4',
        low ? 'border-amber-500/40' : 'border-line',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-fg">{item.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
            {categoryLabel && <span>{categoryLabel}</span>}
            <span>Mínimo {item.min_stock}</span>
            {cost != null && <span>Costo {formatDashboardCurrency(cost, currencyCode)}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${item.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-fg/[0.06] hover:text-fg"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Eliminar ${item.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {low ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" aria-hidden /> Stock bajo
          </span>
        ) : (
          <span />
        )}
        <div
          className="inline-flex items-center rounded-xl border border-line"
          role="group"
          aria-label={`Cantidad de ${item.name}`}
        >
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            disabled={busy || Number(item.quantity) <= 0}
            aria-label="Restar uno"
            className="inline-flex h-9 w-9 items-center justify-center rounded-l-xl text-fg-soft hover:bg-fg/[0.06] disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            className={[
              'min-w-[4.5rem] px-2 text-center text-sm font-semibold tabular-nums',
              low ? 'text-amber-700 dark:text-amber-300' : 'text-fg',
              busy ? 'opacity-50' : '',
            ].join(' ')}
          >
            {item.quantity} <span className="font-normal text-fg-muted">{item.unit}</span>
          </span>
          <button
            type="button"
            onClick={() => onAdjust(1)}
            disabled={busy}
            aria-label="Sumar uno"
            className="inline-flex h-9 w-9 items-center justify-center rounded-r-xl text-fg-soft hover:bg-fg/[0.06] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  )
}

function MovementList({
  movements,
  items,
  timeZone,
}: {
  movements: InventoryMovement[]
  items: InventoryItem[]
  timeZone: string
}) {
  if (movements.length === 0) return null
  const names = new Map(items.map((i) => [i.id, i.name]))

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold text-fg">
        <History className="h-4 w-4 text-fg-muted" aria-hidden /> Últimos movimientos
      </h2>
      <ul className="divide-y divide-line">
        {movements.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <div className="truncate text-fg">
                {(m.item_id ? names.get(m.item_id) : undefined) ?? 'Producto eliminado'}
              </div>
              <div className="text-xs text-fg-subtle">
                {formatoInstanteEnZona(m.created_at, timeZone, 'es', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
                {' · '}
                {m.quantity_before} → {m.quantity_after}
              </div>
            </div>
            <span
              className={[
                'shrink-0 font-semibold tabular-nums',
                m.delta > 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300',
              ].join(' ')}
            >
              {m.delta > 0 ? `+${m.delta}` : m.delta}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
function ItemModal({
  item,
  categories,
  defaultCategory,
  onClose,
  onSubmit,
}: {
  item: InventoryItem | null
  categories: InventoryCategoryOption[]
  defaultCategory: string
  onClose: () => void
  onSubmit: (input: {
    name: string
    category: string
    quantity: number
    min_stock: number
    unit: string
    cost: number | null
  }) => Promise<void>
}) {
  const ids = useId()
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? defaultCategory)
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 0))
  const [minStock, setMinStock] = useState(String(item?.min_stock ?? 5))
  const [unit, setUnit] = useState(item?.unit ?? 'unidad')
  const [cost, setCost] = useState(item?.cost ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = Number.parseInt(quantity, 10)
    const min = Number.parseInt(minStock, 10)
    const c = cost.trim() ? Number.parseFloat(cost) : null
    if (!name.trim()) return setError('Ingresa el nombre del producto.')
    if (!Number.isFinite(q) || q < 0) return setError('La cantidad debe ser 0 o más.')
    if (!Number.isFinite(min) || min < 0) return setError('El mínimo debe ser 0 o más.')
    if (c != null && (!Number.isFinite(c) || c < 0)) return setError('Revisa el costo.')

    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        category,
        quantity: q,
        min_stock: min,
        unit: unit.trim() || 'unidad',
        cost: c,
      })
      onClose()
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  const formId = `${ids}-form`

  return (
    <Modal
      title={item ? 'Editar producto' : 'Nuevo producto'}
      icon={<Package className="h-5 w-5 text-[var(--tenant-primary)]" />}
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            {item ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Nombre" htmlFor={`${ids}-name`}>
          <input
            id={`${ids}-name`}
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Gel base"
            className={inputClass}
          />
        </Field>
        <Field label="Categoría" htmlFor={`${ids}-cat`}>
          <select
            id={`${ids}-cat`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Cantidad" htmlFor={`${ids}-qty`}>
            <input
              id={`${ids}-qty`}
              type="number"
              inputMode="numeric"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Mínimo" htmlFor={`${ids}-min`}>
            <input
              id={`${ids}-min`}
              type="number"
              inputMode="numeric"
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Unidad" htmlFor={`${ids}-unit`}>
            <input
              id={`${ids}-unit`}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="unidad"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Costo por unidad (opcional)" htmlFor={`${ids}-cost`}>
          <input
            id={`${ids}-cost`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={inputClass}
          />
        </Field>
        {item && (
          <p className="text-xs text-fg-subtle">
            Para entradas y salidas del día usa los botones − y + de la tarjeta: quedan registradas
            en el historial.
          </p>
        )}
      </form>
    </Modal>
  )
}

function CategoryModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (label: string) => Promise<void>
}) {
  const ids = useId()
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return setError('Ingresa un nombre.')
    setSaving(true)
    setError(null)
    try {
      await onSubmit(label.trim())
      onClose()
    } catch (err) {
      setError((err as Error).message || 'No se pudo crear la categoría.')
    } finally {
      setSaving(false)
    }
  }

  const formId = `${ids}-form`

  return (
    <Modal
      title="Nueva categoría"
      icon={<Tag className="h-5 w-5 text-[var(--tenant-primary)]" />}
      description="Se suma a las categorías base de tu rubro."
      size="sm"
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving}>
            Crear
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3">
        <FormError message={error} />
        <Field label="Nombre" htmlFor={`${ids}-label`}>
          <input
            id={`${ids}-label`}
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej. Limpieza"
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  )
}
