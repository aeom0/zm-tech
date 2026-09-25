import {
  Activity,
  Baby,
  Bath,
  Brush,
  Car,
  Coffee,
  Crown,
  Droplet,
  Droplets,
  Dumbbell,
  Eye,
  Feather,
  Flame,
  Flower2,
  Gem,
  Hand,
  Heart,
  Leaf,
  PawPrint,
  Palette,
  Scissors,
  Shirt,
  ShoppingBag,
  Smile,
  Sparkles,
  SprayCan,
  Star,
  Stethoscope,
  Sun,
  Syringe,
  Utensils,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * Catálogo de íconos de categoría. Las llaves usan los nombres Feather que ya
 * guarda mobile en `service_categories.icon`, así ambas apps leen el mismo valor.
 * Los nombres extra (sparkles, brush…) son válidos solo en web hasta que mobile
 * los soporte; mobile cae a su ícono por defecto si no los reconoce.
 */
export const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  scissors: { Icon: Scissors, label: 'Tijeras' },
  feather: { Icon: Feather, label: 'Pluma' },
  eye: { Icon: Eye, label: 'Ojos' },
  smile: { Icon: Smile, label: 'Sonrisa' },
  droplet: { Icon: Droplet, label: 'Gota' },
  sun: { Icon: Sun, label: 'Sol' },
  wind: { Icon: Wind, label: 'Aire' },
  heart: { Icon: Heart, label: 'Corazón' },
  star: { Icon: Star, label: 'Estrella' },
  zap: { Icon: Zap, label: 'Rayo' },
  sparkles: { Icon: Sparkles, label: 'Brillos' },
  brush: { Icon: Brush, label: 'Brocha' },
  flower: { Icon: Flower2, label: 'Flor' },
  gem: { Icon: Gem, label: 'Gema' },
  palette: { Icon: Palette, label: 'Paleta' },
  hand: { Icon: Hand, label: 'Manos' },
  droplets: { Icon: Droplets, label: 'Hidratación' },
  bath: { Icon: Bath, label: 'Spa' },
  spray: { Icon: SprayCan, label: 'Spray' },
  leaf: { Icon: Leaf, label: 'Natural' },
  flame: { Icon: Flame, label: 'Calor' },
  crown: { Icon: Crown, label: 'Premium' },
  dumbbell: { Icon: Dumbbell, label: 'Fitness' },
  activity: { Icon: Activity, label: 'Actividad' },
  stethoscope: { Icon: Stethoscope, label: 'Salud' },
  syringe: { Icon: Syringe, label: 'Tratamiento' },
  baby: { Icon: Baby, label: 'Infantil' },
  paw: { Icon: PawPrint, label: 'Mascotas' },
  coffee: { Icon: Coffee, label: 'Café' },
  utensils: { Icon: Utensils, label: 'Comida' },
  shirt: { Icon: Shirt, label: 'Ropa' },
  bag: { Icon: ShoppingBag, label: 'Productos' },
  car: { Icon: Car, label: 'Auto' },
  wrench: { Icon: Wrench, label: 'Taller' },
}

const PRIORITY_BY_BUSINESS_TYPE: Record<string, string[]> = {
  'spa-nails': ['droplet', 'hand', 'sparkles', 'palette', 'brush', 'flower', 'bath'],
  barbershop: ['scissors', 'brush', 'spray', 'crown', 'flame'],
  'hair-salon': ['scissors', 'brush', 'sparkles', 'spray', 'palette'],
  'full-aesthetic': ['sun', 'sparkles', 'eye', 'feather', 'droplets', 'syringe', 'flower'],
}

export function getDefaultCategoryIcon(businessType?: string | null): string {
  return PRIORITY_BY_BUSINESS_TYPE[businessType ?? '']?.[0] ?? 'star'
}

/** Íconos ordenados con los relevantes al rubro del tenant primero. */
export function getCategoryIconOptions(businessType?: string | null): string[] {
  const priority = PRIORITY_BY_BUSINESS_TYPE[businessType ?? ''] ?? []
  const all = Object.keys(CATEGORY_ICONS)
  return [...priority, ...all.filter((k) => !priority.includes(k))]
}

export function resolveCategoryIcon(name?: string | null): LucideIcon | null {
  if (!name) return null
  return CATEGORY_ICONS[name]?.Icon ?? null
}
