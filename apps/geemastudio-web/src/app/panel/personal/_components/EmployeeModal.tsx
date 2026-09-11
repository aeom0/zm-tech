'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2, X } from 'lucide-react'

import type {
  CommissionMode,
  EmployeeRow,
  EmployeeWriteInput,
  PaymentMode,
} from '@/hooks/personal/types'
import {
  DEFAULT_COMMISSION_PERCENT,
  PRESET_COLORS,
} from '@/hooks/personal/types'

export interface EmployeeFormState {
  name: string
  email: string
  phone: string
  color: string
  paymentMode: PaymentMode
  commission_mode: CommissionMode
  commission_percentage: string
  house_cut_fixed: string
  salary_amount: string
  notes: string
  is_active: boolean
}

interface EmployeeModalProps {
  open: boolean
  initial: EmployeeRow | null
  isCreating: boolean
  showGeemaExtras: boolean
  currencyCode: string
  staffSingular: string
  isSaving: boolean
  isDeleting: boolean
  onClose: () => void
  onSave: (args: {
    data: EmployeeWriteInput
    avatarFile: File | null
    removeAvatar: boolean
  }) => void
  onDelete?: () => void
}

function emptyForm(color: string): EmployeeFormState {
  return {
    name: '',
    email: '',
    phone: '',
    color,
    paymentMode: 'commission',
    commission_mode: 'percent',
    commission_percentage: String(DEFAULT_COMMISSION_PERCENT),
    house_cut_fixed: '50',
    salary_amount: '',
    notes: '',
    is_active: true,
  }
}

function fromEmployee(emp: EmployeeRow): EmployeeFormState {
  return {
    name: emp.name,
    email: emp.email ?? '',
    phone: emp.phone ?? '',
    color: emp.color || PRESET_COLORS[0],
    paymentMode: emp.payment_mode ?? 'commission',
    commission_mode: emp.commission_mode === 'fixed_house' ? 'fixed_house' : 'percent',
    commission_percentage:
      emp.commission_percentage != null
        ? String(emp.commission_percentage)
        : String(DEFAULT_COMMISSION_PERCENT),
    house_cut_fixed: emp.house_cut_fixed != null ? String(emp.house_cut_fixed) : '50',
    salary_amount: emp.salary_amount ?? '',
    notes: emp.notes ?? '',
    is_active: emp.is_active,
  }
}

export function EmployeeModal({
  open,
  initial,
  isCreating,
  showGeemaExtras,
  currencyCode,
  staffSingular,
  isSaving,
  isDeleting,
  onClose,
  onSave,
  onDelete,
}: EmployeeModalProps) {
  const [form, setForm] = useState<EmployeeFormState>(() => emptyForm(PRESET_COLORS[0]))
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(initial ? fromEmployee(initial) : emptyForm(PRESET_COLORS[0]))
    setAvatarFile(null)
    setRemoveAvatar(false)
    setFormError(null)
  }, [open, initial])

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const avatarSrc = useMemo(() => {
    if (removeAvatar) return null
    if (previewUrl) return previewUrl
    return initial?.avatar_url?.trim() || null
  }, [removeAvatar, previewUrl, initial?.avatar_url])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const name = form.name.trim()
    if (!name) {
      setFormError('El nombre es obligatorio')
      return
    }

    const paymentMode = showGeemaExtras ? form.paymentMode : 'commission'
    const commissionMode = paymentMode === 'salary' ? 'percent' : form.commission_mode

    let commissionPercentage: number | null = null
    let houseCutFixed: number | null = null

    if (paymentMode !== 'salary' && commissionMode === 'fixed_house') {
      const cut = parseInt(form.house_cut_fixed, 10)
      if (Number.isNaN(cut) || cut < 0) {
        setFormError(`El corte fijo de la casa debe ser >= 0 (${currencyCode})`)
        return
      }
      houseCutFixed = cut
      commissionPercentage = 0
    } else if (paymentMode !== 'salary') {
      const commission = parseInt(form.commission_percentage, 10)
      if (Number.isNaN(commission) || commission < 0 || commission > 100) {
        setFormError('La comisión debe ser un número entre 0 y 100')
        return
      }
      commissionPercentage = commission
    }

    let salaryAmount: number | null = null
    if (showGeemaExtras && paymentMode !== 'commission') {
      const raw = form.salary_amount.trim().replace(',', '.')
      const parsed = raw ? parseFloat(raw) : NaN
      if (Number.isNaN(parsed) || parsed < 0) {
        setFormError('Ingresa un salario válido (>= 0)')
        return
      }
      salaryAmount = parsed
    }

    onSave({
      data: {
        name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        color: form.color.trim() || PRESET_COLORS[0],
        commission_percentage: commissionPercentage,
        commission_mode: commissionMode,
        house_cut_fixed: houseCutFixed,
        payment_mode: paymentMode,
        salary_amount: paymentMode !== 'commission' ? salaryAmount : null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
        avatar_url: initial?.avatar_url ?? null,
      },
      avatarFile,
      removeAvatar,
    })
  }

  const fieldClass =
    'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#40E0D0]/40'
  const labelClass = 'mb-1 block text-xs text-zinc-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-zinc-950 sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <div className="text-xs text-zinc-500">
              {isCreating ? 'Nuevo' : 'Editar'} {staffSingular.toLowerCase()}
            </div>
            <h2 className="text-lg font-bold text-white">
              {isCreating ? `Agregar ${staffSingular.toLowerCase()}` : form.name || staffSingular}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]"
          >
            <X className="h-4 w-4 text-zinc-300" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] text-lg font-bold text-white"
              style={{ backgroundColor: `${form.color}33` }}
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                (form.name.charAt(0) || '?').toUpperCase()
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.08]">
                Subir foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setAvatarFile(f)
                    setRemoveAvatar(false)
                  }}
                />
              </label>
              {(avatarSrc || initial?.avatar_url) && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null)
                    setRemoveAvatar(true)
                  }}
                  className="text-left text-xs text-red-300 hover:text-red-200"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Nombre *</label>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                className={fieldClass}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Color en agenda</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={[
                    'h-9 w-9 rounded-lg border-2 transition-transform',
                    form.color === c ? 'scale-110 border-white' : 'border-transparent',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-9 w-9 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent"
              />
            </div>
          </div>

          {showGeemaExtras && (
            <div>
              <label className={labelClass}>Modo de pago</label>
              <select
                className={fieldClass}
                value={form.paymentMode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentMode: e.target.value as PaymentMode }))
                }
              >
                <option value="commission">Comisión</option>
                <option value="salary">Salario fijo</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>
          )}

          {(!showGeemaExtras || form.paymentMode !== 'salary') && (
            <>
              <div>
                <label className={labelClass}>Tipo de comisión</label>
                <select
                  className={fieldClass}
                  value={form.commission_mode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      commission_mode: e.target.value as CommissionMode,
                    }))
                  }
                >
                  <option value="percent">Porcentaje</option>
                  <option value="fixed_house">Corte fijo casa</option>
                </select>
              </div>
              {form.commission_mode === 'fixed_house' ? (
                <div>
                  <label className={labelClass}>Corte casa ({currencyCode})</label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={form.house_cut_fixed}
                    onChange={(e) => setForm((f) => ({ ...f, house_cut_fixed: e.target.value }))}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Comisión %</label>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={form.commission_percentage}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, commission_percentage: e.target.value }))
                    }
                  />
                </div>
              )}
            </>
          )}

          {showGeemaExtras && form.paymentMode !== 'commission' && (
            <div>
              <label className={labelClass}>Salario ({currencyCode})</label>
              <input
                className={fieldClass}
                inputMode="decimal"
                value={form.salary_amount}
                onChange={(e) => setForm((f) => ({ ...f, salary_amount: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Notas</label>
            <textarea
              className={`${fieldClass} min-h-[72px] resize-y`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-white/10"
            />
            Activo / aparece en agenda
          </label>

          {formError && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-4 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#40E0D0] px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-[#00897B] hover:text-white disabled:opacity-60"
            >
              {isSaving ? 'Guardando…' : 'Guardar'}
            </button>
            {!isCreating && onDelete && (
              <button
                type="button"
                disabled={isDeleting || isSaving}
                onClick={onDelete}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
