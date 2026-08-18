// ============================================================
// RepMAX Business Suite — Constantes del flujo de onboarding
// Solo datos, sin lógica de negocio
// ============================================================

import type { CountryCode, VehicleType, BusinessType, ThemeKey } from '../types/onboarding'

export const COUNTRIES: {
  code: CountryCode
  label: string
  flag: string
  featured: boolean
}[] = [
  { code: 'VE', label: 'Venezuela', flag: '🇻🇪', featured: true },
  { code: 'CO', label: 'Colombia', flag: '🇨🇴', featured: false },
  { code: 'PE', label: 'Perú', flag: '🇵🇪', featured: false },
  { code: 'EC', label: 'Ecuador', flag: '🇪🇨', featured: false },
  { code: 'DO', label: 'Rep. Dom.', flag: '🇩🇴', featured: false },
]

// iconName referencia nombres de MaterialCommunityIcons
export const VEHICLE_OPTIONS: {
  value: VehicleType
  label: string
  iconName: string
  description: string
}[] = [
  {
    value: 'CARS',
    label: 'Carros',
    iconName: 'car-outline',
    description: 'Toyota, Chevrolet, Ford y más',
  },
  {
    value: 'MOTOS',
    label: 'Motos',
    iconName: 'motorbike',
    description: 'Yamaha, Honda, Bera, Empire...',
  },
  { value: 'BOTH', label: 'Ambos', iconName: 'tools', description: 'Inventario mixto completo' },
]

export const BUSINESS_OPTIONS: {
  value: BusinessType
  label: string
  iconName: string
  description: string
}[] = [
  {
    value: 'PARTS_STORE',
    label: 'Repuestos',
    iconName: 'store-outline',
    description: 'Venta de repuestos y accesorios',
  },
  {
    value: 'WORKSHOP',
    label: 'Taller',
    iconName: 'wrench-outline',
    description: 'Taller con venta de partes',
  },
  {
    value: 'BOTH',
    label: 'Ambos',
    iconName: 'garage-variant',
    description: 'Taller y tienda combinados',
  },
]

export const THEMES: {
  key: ThemeKey
  name: string
  color: string
  description: string
}[] = [
  { key: 'turbo', name: 'Turbo', color: '#CC0000', description: 'Rojo · Potencia y velocidad' },
  { key: 'acero', name: 'Acero', color: '#1E5EFF', description: 'Azul · Precisión y confianza' },
  { key: 'terreno', name: 'Terreno', color: '#4A5C3A', description: 'Verde · Campo y aventura' },
]

// Nombre de icono del mock del Dashboard según tipo de vehículo
export const VEHICLE_DASHBOARD_ICON: Record<VehicleType, string> = {
  CARS: 'car-outline',
  MOTOS: 'motorbike',
  BOTH: 'tools',
}

// Marcas sugeridas según tipo de vehículo seleccionado
export const BRANDS_BY_VEHICLE: Record<VehicleType, string[]> = {
  CARS: ['Toyota', 'Chevrolet', 'Ford', 'Nissan', 'Hyundai', 'Kia', 'Mitsubishi', 'Chery', 'BYD'],
  MOTOS: ['Yamaha', 'Honda', 'Bera', 'Empire', 'Haojue', 'Suzuki', 'Kawasaki'],
  BOTH: ['Toyota', 'Chevrolet', 'Yamaha', 'Honda', 'Bera', 'Ford', 'Nissan', 'Chery'],
}
