import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(numPrice)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function generateTrackingCode(): string {
  const prefix = 'CHV'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export const VEHICLE_TYPES = {
  CAR: { label: 'Carro', icon: 'car' },
  MOTO: { label: 'Moto', icon: 'bike' },
  TRUCK: { label: 'Camion', icon: 'truck' },
  SUV: { label: 'Camioneta', icon: 'car-front' },
} as const

export const CONDITIONS = {
  NEW: { label: 'NUEVO', color: 'bg-petrol' },
  USED: { label: 'USADO', color: 'bg-orange' },
} as const

export const LOCATIONS = [
  'Maracay',
  'Caracas',
  'Valencia',
  'Maracaibo',
  'Barquisimeto',
  'Maturin',
  'Barcelona',
  'Ciudad Guayana',
  'San Cristobal',
  'Merida',
] as const

export const POPULAR_BRANDS = [
  { key: 'toyota', label: 'Toyota', emoji: '🚗' },
  { key: 'chevrolet', label: 'Chevrolet', emoji: '🚙' },
  { key: 'ford', label: 'Ford', emoji: '🚐' },
  { key: 'empire', label: 'Empire', emoji: '🏍️' },
  { key: 'bera', label: 'Bera', emoji: '🛵' },
  { key: 'hyundai', label: 'Hyundai', emoji: '🚗' },
  { key: 'kia', label: 'Kia', emoji: '🚙' },
  { key: 'honda', label: 'Honda', emoji: '🏎️' },
] as const
