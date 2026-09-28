'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  LayoutGrid,
  Mail,
  MessageCircle,
  Search,
  Settings,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'

type FaqCategory = 'todas' | 'agenda' | 'waba' | 'finanzas' | 'clientes' | 'configuracion'

interface FaqItem {
  id: string
  category: FaqCategory
  question: string
  answer: string
  link?: {
    href: string
    label: string
  }
}

const FAQS: FaqItem[] = [
  // Agenda y Citas
  {
    id: 'crear-cita',
    category: 'agenda',
    question: '¿Cómo creo o agendo una nueva cita?',
    answer:
      'Ve a la sección Agenda y pulsa sobre el horario deseado o el botón de agendar. Selecciona la clienta, el servicio o pack, la fecha, hora y el profesional que atenderá la cita.',
    link: { href: '/panel/agenda', label: 'Ir a Agenda' },
  },
  {
    id: 'cancelar-cita',
    category: 'agenda',
    question: '¿Cómo cancelo una cita y qué ocurre con el registro?',
    answer:
      'Al abrir el detalle de una cita, puedes pulsar "Cancelar cita". Se te solicitará un motivo y una observación opcional. La cita no se borra de la base de datos: queda registrada con estado cancelada para mantener el historial y las métricas intactas.',
    link: { href: '/panel/agenda', label: 'Ver Agenda' },
  },
  {
    id: 'estados-cita',
    category: 'agenda',
    question: '¿Cuáles son los estados de una cita?',
    answer:
      'Una cita puede estar agendada (scheduled), confirmada (payment_submitted/confirmed), completada (completed), no asistió (no_show) o cancelada (cancelled). Cada estado actualiza automáticamente los indicadores del día.',
  },

  // WhatsApp y Bot WABA
  {
    id: 'pausar-bot',
    category: 'waba',
    question: '¿Cómo atiendo a una clienta por WhatsApp sin que el bot interfiera?',
    answer:
      'Entra a WhatsApp → Mensajes, abre la conversación con la clienta y pulsa el botón "Pausar bot". A partir de ese momento, el bot se detiene para ese número y tú puedes responder manualmente. Al terminar, pulsa "Reactivar bot".',
    link: { href: '/panel/waba/mensajes', label: 'Ir a Mensajes de WhatsApp' },
  },
  {
    id: 'ventana-24h',
    category: 'waba',
    question: '¿Qué es la ventana de 24 horas de WhatsApp?',
    answer:
      'Por política oficial de Meta (WhatsApp Business API), cuando una clienta escribe un mensaje se abre una ventana de atención de 24 horas en la que puedes enviar texto libre, fotos, audios y documentos sin costo adicional. Pasadas las 24 horas, solo se pueden enviar plantillas oficiales aprobadas por Meta.',
  },
  {
    id: 'respuestas-rapidas',
    category: 'waba',
    question: '¿Cómo utilizo las respuestas rápidas en el chat?',
    answer:
      'En la parte inferior de cualquier conversación tienes botones de acceso rápido: Saludo (con el nombre de la clienta), Agendar cita (con el enlace a tu web), Confirmar cita y Medios de pago (transferencias, efectivo y Yape/Plin). Al tocarlos, el texto se inserta en el editor para que puedas personalizarlo antes de enviar.',
  },

  // Finanzas y Pagos
  {
    id: 'recargo-pos',
    category: 'finanzas',
    question: '¿Cómo funciona el recargo del 5% del POS / tarjeta?',
    answer:
      'El recargo POS es configurable desde Configuración (por defecto 5%). Al registrar un cobro con tarjeta, el sistema desglosa automáticamente la comisión de la pasarela para que no infle tus ingresos netos reales en el reporte financiero.',
    link: { href: '/panel/configuracion', label: 'Ver Configuración' },
  },
  {
    id: 'comisiones-personal',
    category: 'finanzas',
    question: '¿Cómo se calculan las comisiones de los empleados?',
    answer:
      'Cada profesional tiene configurado su porcentaje de comisión en la sección Personal. En Finanzas puedes ver el desglose por período de lo ganado por cada uno y registrar los pagos realizados.',
    link: { href: '/finanzas', label: 'Ir a Finanzas' },
  },
  {
    id: 'venta-productos',
    category: 'finanzas',
    question: '¿Puedo registrar venta de productos además de servicios?',
    answer:
      'Sí. En Catálogo → Productos o directamente en Finanzas puedes registrar la venta de cualquier producto en inventario, seleccionando el método de pago.',
    link: { href: '/panel/servicios?tab=productos', label: 'Ver Productos' },
  },

  // Clientes
  {
    id: 'segmentos-clientes',
    category: 'clientes',
    question: '¿Qué significan los segmentos VIP, Nuevas y En riesgo?',
    answer:
      'VIP: clientas con 3 o más visitas acumuladas. Nuevas: registradas en los últimos 30 días. En riesgo: clientas que no te visitan desde hace más de 45 días, ideales para enviarles una promoción de reactivación.',
    link: { href: '/panel/clientes', label: 'Ir a Clientes' },
  },
  {
    id: 'whatsapp-desde-ficha',
    category: 'clientes',
    question: '¿Cómo abro el chat de WhatsApp de una clienta?',
    answer:
      'En la sección Clientes, abre la ficha de la persona y pulsa el botón de WhatsApp. El panel te llevará directamente al hilo de mensajes de ese contacto.',
  },

  // Configuración y Marca
  {
    id: 'cambiar-logo-colores',
    category: 'configuracion',
    question: '¿Cómo cambio el logo y los colores del negocio?',
    answer:
      'Ve a Configuración → General. Puedes subir una imagen para tu logo (se almacena de forma segura en la nube) y elegir el color primario y de acento de tu marca.',
    link: { href: '/panel/configuracion', label: 'Ir a Configuración' },
  },
  {
    id: 'configurar-horario',
    category: 'configuracion',
    question: '¿Cómo defino el horario de atención y los días de apertura?',
    answer:
      'En Configuración → Horarios puedes activar o desactivar cada día de la semana, definir la hora de apertura y cierre, y seleccionar el formato de hora (12 horas o 24 horas).',
    link: { href: '/panel/horarios', label: 'Ir a Horarios' },
  },
  {
    id: 'landing-publica',
    category: 'configuracion',
    question: '¿Cómo activo mi página web pública para que las clientas vean los servicios?',
    answer:
      'En Configuración → Presencia web activa el modo "Geema hosted", elige un slug para tu negocio (por ejemplo "mi-salon") y guarda los cambios. Tu catálogo estará disponible en geema.zmtechdev.com/s/mi-salon.',
    link: { href: '/panel/configuracion', label: 'Configurar Web' },
  },
]

const CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: 'todas', label: 'Todas las preguntas' },
  { id: 'agenda', label: 'Agenda y Citas' },
  { id: 'waba', label: 'WhatsApp y Bot' },
  { id: 'finanzas', label: 'Finanzas y POS' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'configuracion', label: 'Configuración' },
]

export default function PanelAyudaPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<FaqCategory>('todas')
  const [expandedId, setExpandedId] = useState<string | null>('crear-cita')

  const tenantSettingsQuery = useTenantSettings()
  const tenant = tenantSettingsQuery.data

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return FAQS.filter((item) => {
      if (category !== 'todas' && item.category !== category) return false
      if (!q) return true
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      )
    })
  }, [category, search])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Encabezado */}
      <div>
        <div className="text-xs text-zinc-500">Panel</div>
        <h1 className="text-2xl font-bold text-white">Centro de Ayuda</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Respuestas a preguntas frecuentes, guías de operación y soporte técnico directo.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar una duda o función (ej. cancelar cita, pausar bot, POS, comisiones)…"
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-9 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[var(--tenant-primary)]/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            aria-label="Borrar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chips de categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={[
              'shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
              category === cat.id
                ? 'border-[var(--tenant-primary)]/40 bg-[var(--tenant-primary)]/15 font-semibold text-[var(--tenant-primary)]'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200',
            ].join(' ')}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Lista de Preguntas / Acordeón */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
            No se encontraron respuestas para tu búsqueda. Prueba con otras palabras o contacta a soporte.
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = expandedId === faq.id
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span className="text-sm font-semibold text-white">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={[
                      'h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200',
                      isOpen ? 'rotate-180 text-[var(--tenant-primary)]' : '',
                    ].join(' ')}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-white/[0.06] bg-black/20 p-4 text-sm leading-relaxed text-zinc-300">
                    <p>{faq.answer}</p>
                    {faq.link && (
                      <div className="mt-3">
                        <Link
                          href={faq.link.href}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--tenant-primary)] hover:underline"
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
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <h2 className="text-base font-semibold text-white">¿Necesitas asistencia técnica?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          El equipo de soporte de GeemaStudio y ZM Tech está disponible para ayudarte ante dudas operativas o configuraciones avanzadas.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="https://wa.me/584120000000?text=Hola,%20necesito%20asistencia%20con%20el%20panel%20de%20GeemaStudio"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-200 transition-colors hover:bg-emerald-500/15"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">WhatsApp de soporte</div>
              <div className="text-xs text-emerald-300/80">Atención técnica directa</div>
            </div>
          </a>

          <a
            href="mailto:soporte@zmtechdev.com"
            className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-zinc-200 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">soporte@zmtechdev.com</div>
              <div className="text-xs text-zinc-400">Consultas generales por correo</div>
            </div>
          </a>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-zinc-400">Negocio activo:</span>{' '}
            {tenant?.business_name || 'GeemaStudio'}
          </div>
          <div>
            <span className="font-semibold text-zinc-400">Zona horaria:</span>{' '}
            {tenant?.timezone || 'America/Caracas'}
          </div>
          <div>
            <span className="font-semibold text-zinc-400">Plataforma:</span> GeemaStudio Panel Web v1.0
          </div>
        </div>
      </div>
    </div>
  )
}
