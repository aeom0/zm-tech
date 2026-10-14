'use client'

import { useState } from 'react'
import { X, User, Phone, Mail, FileText } from 'lucide-react'
import {
  checkDocument,
  checkEmail,
  checkPhone,
  createClient,
  updateClient,
  type ClientFormPayload,
} from '@geemastudio/data'
import { supabase } from '@/lib/supabase'

export interface ClientModalItem {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  dni?: string | null
  notes?: string | null
}

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface ClientModalProps {
  clientToEdit?: ClientModalItem | null
  country: string
  tenantId: string
  onClose: () => void
  onSuccess: () => void
}

export function ClientModal({
  clientToEdit,
  country,
  tenantId,
  onClose,
  onSuccess,
}: ClientModalProps) {
  const [name, setName] = useState(clientToEdit?.name || '')
  const [phone, setPhone] = useState(clientToEdit?.phone || '')
  const [email, setEmail] = useState(clientToEdit?.email || '')
  const [dni, setDni] = useState(clientToEdit?.dni || '')
  const [notes, setNotes] = useState(clientToEdit?.notes || '')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const phoneCheck = checkPhone(phone, country)
  const docCheck = checkDocument(dni, country)
  const emailCheck = checkEmail(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    if (!name.trim()) {
      setErrorMessage('Ingresa el nombre del cliente')
      return
    }

    if (phoneCheck.error) {
      setErrorMessage(phoneCheck.error)
      return
    }
    if (docCheck.error) {
      setErrorMessage(docCheck.error)
      return
    }
    if (emailCheck.error) {
      setErrorMessage(emailCheck.error)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const payload: ClientFormPayload = {
      name: name.trim(),
      phone,
      email,
      dni,
      notes,
    }

    try {
      if (clientToEdit) {
        await updateClient(supabase, clientToEdit.id, payload, { country })
      } else {
        await createClient(supabase, payload, { tenantId, country })
      }
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo guardar el cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-fg/[0.08] bg-sunken p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-fg/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[var(--tenant-primary)]" />
            <h2 className="text-lg font-bold text-fg">
              {clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-fg/[0.05] hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Nombre y apellido *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María Pérez"
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Teléfono (WhatsApp)
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. +51 987654321"
                className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
              />
            </div>
            {phoneCheck.hint && (
              <p className="mt-1 text-[11px] text-fg-subtle">{phoneCheck.hint}</p>
            )}
            {phoneCheck.error && (
              <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{phoneCheck.error}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Documento / Cédula / DNI
            </label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Número de documento"
                className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
              />
            </div>
            {docCheck.hint && <p className="mt-1 text-[11px] text-fg-subtle">{docCheck.hint}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
              />
            </div>
            {emailCheck.error && (
              <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{emailCheck.error}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Notas del cliente (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferencias, alergias, historial…"
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-fg/[0.08] px-4 py-2 text-sm font-medium text-fg-soft hover:bg-fg/[0.04]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[var(--tenant-primary)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando…' : clientToEdit ? 'Actualizar' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
