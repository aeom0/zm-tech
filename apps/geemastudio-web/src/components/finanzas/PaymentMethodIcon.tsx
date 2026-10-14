import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { paymentMethodIcon } from '@geemastudio/data'

export function PaymentMethodIcon({ method }: { method: string }) {
  const icon = paymentMethodIcon(method)
  if (icon === 'credit-card') return <CreditCard className="h-3.5 w-3.5" />
  if (icon === 'smartphone') return <Smartphone className="h-3.5 w-3.5" />
  return <Banknote className="h-3.5 w-3.5" />
}
