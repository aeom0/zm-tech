'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Mail, MessageCircle, Search, X } from 'lucide-react'
import { GUIA_AYUDA, GUIA_CATEGORIAS, type GuiaCategoria } from '@geemastudio/shared-schema'

import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { FilterChips } from '@/components/ui/FilterChips'
import { PageHeader } from '@/components/ui/PageHeader'

type FaqCategory = 'todas' | GuiaCategoria

const CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: 'todas', label: 'Todas las preguntas' },
  ...GUIA_CATEGORIAS,
]

export default function PanelAyudaPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FaqCategory>('todas')
  const [expandedId, setExpandedId] = useState<string | null>('crear-cita')

  const tenantSettingsQuery = useTenantSettings()
  const tenant = tenantSettingsQuery.data

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return GUIA_AYUDA.filter((item) => {
      if (category !== 'todas' && item.category !== category) return false
      if (!q) return true
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    })
  }, [category, search])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Encabezado */}
      <PageHeader title="Centro de Ayuda" description="Respuestas a preguntas frecuentes, guías de operación y soporte técnico directo." />

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar una duda o función (ej. cancelar cita, pausar asistente, POS, comisiones)…"
          className="focus:border-[var(--tenant-primary)]/40 w-full rounded-2xl border border-fg/[0.08] bg-fg/[0.04] py-3 pl-10 pr-9 text-base text-fg outline-none placeholder:text-fg-subtle md:text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-soft"
            aria-label="Borrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chips de categorías */}
      <FilterChips
        scroll
        ariaLabel="Categoría de ayuda"
        options={CATEGORIES}
        value={category}
        onChange={setCategory}
      />

      {/* Lista de Preguntas / Acordeón */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-fg/[0.08] bg-card p-8 text-center text-sm text-fg-subtle">
            No se encontraron respuestas para tu búsqueda. Prueba con otras palabras o contacta a
            soporte.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = expandedId === faq.id
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-card transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-card"
                >
                  <span className="text-sm font-semibold text-fg">{faq.question}</span>
                  <ChevronDown
                    className={[
                      'h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200',
                      isOpen ? 'rotate-180 text-tenant-text' : '',
                    ].join(' ')}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-fg/[0.06] bg-scrim/20 p-4 text-sm leading-relaxed text-fg-soft">
                    <p>{faq.answer}</p>
                    {faq.link && (
                      <div className="mt-3">
                        <Link
                          href={faq.link.href}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-tenant-text hover:underline"
                        >
                          <span>{faq.link.label}</span>
                          <span>→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Canales de soporte técnico */}
      <div className="rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-5">
        <h2 className="text-base font-semibold text-fg">¿Necesitas asistencia técnica?</h2>
        <p className="mt-1 text-sm text-fg-muted">
          El equipo de soporte de GeemaStudio y ZM Tech está disponible para ayudarte ante dudas
          operativas o configuraciones avanzadas.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="https://wa.me/584144940417?text=Hola,%20necesito%20asistencia%20con%20el%20panel%20de%20GeemaStudio"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-800 transition-colors hover:bg-emerald-500/15 dark:text-emerald-200"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-fg">WhatsApp de soporte</div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                Atención técnica directa
              </div>
            </div>
          </a>

          <a
            href="mailto:soporte@zmtechdev.com"
            className="flex items-center gap-3 rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-3.5 text-fg-soft transition-colors hover:bg-fg/[0.06]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fg/[0.06] text-fg-soft">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-fg">soporte@zmtechdev.com</div>
              <div className="text-xs text-fg-muted">Consultas generales por correo</div>
            </div>
          </a>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="rounded-2xl border border-fg/[0.08] bg-card p-4 text-xs text-fg-subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-fg-muted">Negocio activo:</span>{' '}
            {tenant?.business_name || 'GeemaStudio'}
          </div>
          <div>
            <span className="font-semibold text-fg-muted">Zona horaria:</span>{' '}
            {tenant?.timezone || 'America/Caracas'}
          </div>
          <div>
            <span className="font-semibold text-fg-muted">Plataforma:</span> GeemaStudio Panel Web
            v1.0
          </div>
        </div>
      </div>
    </div>
  )
}
