import {
  Crown,
  Droplet,
  Droplets,
  Ear,
  Eye,
  Feather,
  FlaskConical,
  Flower2,
  Footprints,
  Gem,
  Hand,
  Heart,
  HeartPulse,
  Leaf,
  Moon,
  Package,
  Paintbrush,
  Palette,
  Pipette,
  Ruler,
  Scissors,
  ScanFace,
  Smile,
  SmilePlus,
  Sparkles,
  SprayCan,
  Sprout,
  Star,
  Sun,
  Syringe,
  UserRound,
  WandSparkles,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * Catálogo de íconos de categoría para negocios de belleza y bienestar. Las llaves
 * que coinciden con mobile (scissors, feather, eye, smile, droplet, sun, wind, heart,
 * star, zap) usan nombres Feather; el resto solo lo reconoce web por ahora y mobile
 * cae a su ícono por defecto.
 */
export const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  // Uñas y manos
  hand: { Icon: Hand, label: 'Manicure' },
  footprints: { Icon: Footprints, label: 'Pedicure' },
  paintbrush: { Icon: Paintbrush, label: 'Esmalte' },
  droplet: { Icon: Droplet, label: 'Esmaltado' },
  gem: { Icon: Gem, label: 'Gel y acrílico' },
  sparkles: { Icon: Sparkles, label: 'Nail art' },
  // Cabello
  scissors: { Icon: Scissors, label: 'Corte' },
  wand: { Icon: WandSparkles, label: 'Peinado' },
  flask: { Icon: FlaskConical, label: 'Tintes' },
  pipette: { Icon: Pipette, label: 'Coloración' },
  palette: { Icon: Palette, label: 'Balayage' },
  droplets: { Icon: Droplets, label: 'Lavado e hidratación' },
  wind: { Icon: Wind, label: 'Secado' },
  spray: { Icon: SprayCan, label: 'Fijadores' },
  // Barbería
  user: { Icon: UserRound, label: 'Caballero' },
  ruler: { Icon: Ruler, label: 'Perfilado' },
  crown: { Icon: Crown, label: 'Premium' },
  // Pestañas, cejas y rostro
  eye: { Icon: Eye, label: 'Mirada y cejas' },
  feather: { Icon: Feather, label: 'Pestañas' },
  face: { Icon: ScanFace, label: 'Facial' },
  smile: { Icon: Smile, label: 'Sonrisa' },
  'smile-plus': { Icon: SmilePlus, label: 'Rellenos' },
  syringe: { Icon: Syringe, label: 'Inyectables' },
  // Estética corporal y spa
  sun: { Icon: Sun, label: 'Depilación y bronceado' },
  zap: { Icon: Zap, label: 'Láser' },
  'heart-pulse': { Icon: HeartPulse, label: 'Tratamientos' },
  waves: { Icon: Waves, label: 'Masajes' },
  flower: { Icon: Flower2, label: 'Spa' },
  leaf: { Icon: Leaf, label: 'Natural' },
  sprout: { Icon: Sprout, label: 'Orgánico' },
  moon: { Icon: Moon, label: 'Relajación' },
  ear: { Icon: Ear, label: 'Piercing' },
  // Generales
  heart: { Icon: Heart, label: 'Favoritos' },
  star: { Icon: Star, label: 'Destacado' },
  package: { Icon: Package, label: 'Packs' },
}

const PRIORITY_BY_BUSINESS_TYPE: Record<string, string[]> = {
  'spa-nails': [
    'hand', 'footprints', 'paintbrush', 'droplet', 'gem', 'sparkles', 'flower', 'waves', 'leaf', 'moon',
  ],
  barbershop: ['scissors', 'user', 'ruler', 'spray', 'crown', 'droplets', 'wind', 'smile'],
  'hair-salon': [
    'scissors', 'wand', 'flask', 'pipette', 'palette', 'droplets', 'wind', 'spray', 'sparkles',
  ],
  'full-aesthetic': [
    'feather', 'eye', 'face', 'sparkles', 'syringe', 'smile-plus', 'sun', 'zap', 'heart-pulse', 'waves', 'flower',
  ],
}

export function getDefaultCategoryIcon(businessType?: string | null): string {
  return PRIORITY_BY_BUSINESS_TYPE[businessType ?? '']?.[0] ?? 'sparkles'
}

/** Íconos sugeridos para el rubro del tenant y el resto del catálogo. */
export function getCategoryIconGroups(businessType?: string | null): {
  suggested: string[]
  others: string[]
} {
  const suggested = PRIORITY_BY_BUSINESS_TYPE[businessType ?? ''] ?? []
  return {
    suggested,
    others: Object.keys(CATEGORY_ICONS).filter((k) => !suggested.includes(k)),
  }
}

export function resolveCategoryIcon(name?: string | null): LucideIcon | null {
  if (!name) return null
  return CATEGORY_ICONS[name]?.Icon ?? null
}
