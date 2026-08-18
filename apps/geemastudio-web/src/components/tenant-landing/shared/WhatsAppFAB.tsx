import { MessageCircle } from 'lucide-react'

interface WhatsAppFABProps {
  phone: string | null
  businessName: string
}

export function WhatsAppFAB({ phone, businessName }: WhatsAppFABProps) {
  if (!phone) return null

  const cleanPhone = phone.replace(/\D/g, '')
  const message = encodeURIComponent(`Hola ${businessName}, quiero reservar una cita`)
  const href = `https://wa.me/${cleanPhone}?text=${message}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-[rgba(37,211,102,0.4)]"
    >
      <MessageCircle size={28} strokeWidth={2} aria-hidden />
    </a>
  )
}
