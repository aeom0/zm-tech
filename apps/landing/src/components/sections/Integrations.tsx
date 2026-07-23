'use client'

import { motion } from 'framer-motion'
import {
  ShoppingBag,
  CreditCard,
  MessageCircle,
  Banknote,
  TrendingUp,
  FileText,
  Calendar,
  Send,
  Megaphone,
  Shield,
} from 'lucide-react'
import type { ElementType } from 'react'

interface Integration {
  name: string
  category: string
  categoryColor: string
  icon: ElementType
  iconColor: string
  glowColor: string
  description: string
}

const integrations: Integration[] = [
  {
    name: 'MercadoLibre',
    category: 'E-commerce',
    categoryColor: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    icon: ShoppingBag,
    iconColor: 'text-yellow-400',
    glowColor: 'hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]',
    description:
      'Sincroniza tu catálogo, gestiona órdenes y actualiza stock en tiempo real desde tu sistema — sin abrir MercadoLibre manualmente.',
  },
  {
    name: 'Cashea',
    category: 'Pagos en cuotas',
    categoryColor: 'text-green-400 border-green-400/30 bg-green-400/10',
    icon: CreditCard,
    iconColor: 'text-green-400',
    glowColor: 'hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]',
    description:
      'Muestra las cuotas Cashea en tu tienda o sistema. Tus clientes ven al instante cuánto pagan por semana — y eso cierra más ventas.',
  },
  {
    name: 'WhatsApp Business',
    category: 'Comunicación',
    categoryColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    icon: MessageCircle,
    iconColor: 'text-emerald-400',
    glowColor: 'hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]',
    description:
      'Confirmaciones de cita, alertas de pedido, recordatorios automáticos y atención al cliente — todo desde WhatsApp sin intervención humana.',
  },
  {
    name: 'Stripe',
    category: 'Pagos globales',
    categoryColor: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    icon: Banknote,
    iconColor: 'text-blue-400',
    glowColor: 'hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(96,165,250,0.2)]',
    description:
      'Cobra en dólares, euros o cualquier moneda con tarjeta o link de pago. Ideal para negocios con clientes internacionales o en la diáspora.',
  },
  {
    name: 'Tasa BCV',
    category: 'Finanzas Venezuela',
    categoryColor: 'text-red-400 border-red-400/30 bg-red-400/10',
    icon: TrendingUp,
    iconColor: 'text-red-400',
    glowColor: 'hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(248,113,113,0.2)]',
    description:
      'Tasa oficial del BCV actualizada automáticamente en tu sistema. Precios en bolívares siempre correctos, sin actualizarlos a mano cada día.',
  },
  {
    name: 'Facturación SENIAT',
    category: 'Fiscal',
    categoryColor: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    icon: FileText,
    iconColor: 'text-orange-400',
    glowColor: 'hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.2)]',
    description:
      'Facturas y notas de entrega conformes con el Art. 177 del SENIAT. Tu negocio en regla sin perder tiempo llenando formularios a mano.',
  },
  {
    name: 'Google Calendar',
    category: 'Agenda',
    categoryColor: 'text-sky-400 border-sky-400/30 bg-sky-400/10',
    icon: Calendar,
    iconColor: 'text-sky-400',
    glowColor: 'hover:border-sky-500/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]',
    description:
      'Citas y reservas sincronizadas con Google Calendar en tiempo real. Tu equipo ve su agenda actualizada sin usar otra app aparte.',
  },
  {
    name: 'Telegram Bot',
    category: 'Notificaciones',
    categoryColor: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
    icon: Send,
    iconColor: 'text-cyan-400',
    glowColor: 'hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]',
    description:
      'Alertas instantáneas a tu equipo o clientes vía Telegram. Nuevas ventas, errores del sistema, recordatorios — todo llega al instante.',
  },
  {
    name: 'Meta / Instagram',
    category: 'Marketing',
    categoryColor: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
    icon: Megaphone,
    iconColor: 'text-pink-400',
    glowColor: 'hover:border-pink-500/50 hover:shadow-[0_0_20px_rgba(244,114,182,0.2)]',
    description:
      'Conecta tu catálogo de productos directamente con Instagram Shopping y Meta Ads. Más alcance, sin trabajo extra de tu parte.',
  },
  {
    name: 'Acceso Seguro',
    category: 'Seguridad',
    categoryColor: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
    icon: Shield,
    iconColor: 'text-violet-400',
    glowColor: 'hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(167,139,250,0.2)]',
    description:
      'Ingreso seguro con correo, Google o enlace mágico. Control de acceso por usuario para que cada quien vea solo lo que le corresponde.',
  },
]

export default function Integrations() {
  return (
    <section
      id="integraciones"
      className="border-y border-white/5 bg-black/30 py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-xs tracking-widest text-violet-400 uppercase">
            Ecosistema Conectado
          </p>
          <h2 className="text-5xl font-black text-white">
            Tu negocio conectado con todo
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
            Integramos tu software con las herramientas que ya usas — y las que necesitas para
            crecer en el mercado venezolano y latinoamericano.
          </p>
          <div className="mx-auto mt-6 h-0.5 w-16 bg-violet-500" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {integrations.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true }}
              className={`flex flex-col gap-3 rounded-xl border border-white/5 bg-white/3 p-5 backdrop-blur-sm transition-all duration-300 ${item.glowColor}`}
            >
              <span
                className={`w-fit rounded border px-2 py-0.5 font-mono text-xs ${item.categoryColor}`}
              >
                {item.category}
              </span>
              <item.icon className={`h-8 w-8 ${item.iconColor}`} />
              <p className="text-base font-bold text-white">{item.name}</p>
              <p className="text-xs leading-relaxed text-gray-400">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
