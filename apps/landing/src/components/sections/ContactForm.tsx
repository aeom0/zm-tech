'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Terminal } from 'lucide-react'

const schema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  empresa: z.string().min(2, 'La empresa debe tener al menos 2 caracteres'),
  whatsapp: z.string().min(7, 'Ingresa un número válido'),
  presupuesto: z.string().min(1, 'Selecciona un presupuesto estimado'),
})

type FormData = z.infer<typeof schema>

const labelClass = 'block font-mono text-xs uppercase tracking-widest text-gray-500 mb-2'
const inputClass =
  'w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder:text-gray-700 focus:border-violet-500/50 focus:outline-none font-mono text-sm transition-colors'

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al enviar')
      setSubmitted(true)
    } catch {
      setError('Hubo un error al enviar. Intenta de nuevo o escríbenos directamente por WhatsApp.')
    }
  }

  return (
    <section id="contacto" className="py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-white/10 bg-white/5 p-8">
          {/* Header */}
          <div className="mb-2 flex items-center gap-3">
            <Terminal className="h-6 w-6 text-violet-400" />
            <h2 className="text-3xl font-black text-white">¿Tienes un proyecto en mente?</h2>
          </div>
          <p className="mb-4 font-mono text-sm text-gray-500">Cuéntanos qué necesitas. Te respondemos en menos de 24 horas con una propuesta concreta.</p>
          <div className="mb-8 border-t border-white/10" />

          {submitted ? (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 py-16 text-center">
              <p className="font-mono text-sm tracking-widest text-violet-300 uppercase">
                ✓ PAYLOAD RECIBIDO — CONEXIÓN ESTABLECIDA
              </p>
              <p className="mt-2 text-sm text-gray-500">¡Listo! Te escribimos en menos de 24h 🚀</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>NOMBRE / OPERADOR</label>
                  <input {...register('nombre')} className={inputClass} placeholder="John Doe" />
                  {errors.nombre && (
                    <p className="mt-1 font-mono text-xs text-red-400">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>EMPRESA / ORGANIZACIÓN</label>
                  <input {...register('empresa')} className={inputClass} placeholder="Acme Corp" />
                  {errors.empresa && (
                    <p className="mt-1 font-mono text-xs text-red-400">{errors.empresa.message}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>ENLACE COM (WHATSAPP)</label>
                  <input
                    {...register('whatsapp')}
                    className={inputClass}
                    placeholder="+58 412 000 0000"
                  />
                  {errors.whatsapp && (
                    <p className="mt-1 font-mono text-xs text-red-400">{errors.whatsapp.message}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>PRESUPUESTO ESTIMADO (USD)</label>
                  <input
                    {...register('presupuesto')}
                    className={inputClass}
                    placeholder="Ej: $150 - $400"
                  />
                  {errors.presupuesto && (
                    <p className="mt-1 font-mono text-xs text-red-400">
                      {errors.presupuesto.message}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <p className="mt-4 font-mono text-xs text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-lg bg-violet-600 py-4 font-mono text-sm tracking-widest text-white uppercase transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'PROCESANDO...' : 'Quiero mi cotización →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
