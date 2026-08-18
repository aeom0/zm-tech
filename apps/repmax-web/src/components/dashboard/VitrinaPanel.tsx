'use client'

import { Copy, ExternalLink, Store } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useAuth } from '@/context/AuthContext'
import { urlVitrinaTienda } from '@/lib/site-url'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export function VitrinaPanel() {
  const { store } = useAuth()
  const { toast } = useToast()

  if (!store?.slug) return null

  const vitrinaUrl = urlVitrinaTienda(store.slug)

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(vitrinaUrl)
      toast({
        title: 'Link copiado',
        description: 'Pégalo en WhatsApp, Instagram o donde vendas.',
      })
    } catch {
      toast({
        title: 'No se copió',
        description: 'Copia manual: ' + vitrinaUrl,
        variant: 'destructive',
      })
    }
  }

  return (
    <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[#FF6B00]">
            <Store className="h-5 w-5" aria-hidden />
            <h2 className="text-lg font-semibold text-[#F5F5F5]">Tu vitrina</h2>
          </div>
          <p className="mt-2 text-sm text-[#9E9E9E]">
            Catálogo público para clientes fuera de MercadoLibre. Comparte el link o el QR en
            mostrador y redes.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block truncate rounded-md border border-[#2A2A2A] bg-[#242424] px-3 py-2 text-sm text-[#F5F5F5]">
              {vitrinaUrl}
            </code>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#2A2A2A] bg-[#242424] text-[#F5F5F5] hover:bg-[#2A2A2A]"
                onClick={() => void copiarLink()}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#2A2A2A] bg-[#242424] text-[#F5F5F5] hover:bg-[#2A2A2A]"
                asChild
              >
                <a href={vitrinaUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-lg border border-[#2A2A2A] bg-white p-4">
          <QRCode value={vitrinaUrl} size={128} level="M" />
          <p className="text-xs text-[#616161]">QR vitrina</p>
        </div>
      </div>
    </section>
  )
}
