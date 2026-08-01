// ============================================================
// RepMAX Business Suite — Tipos del flujo de onboarding
// ============================================================

export type CountryCode = 'VE' | 'CO' | 'PE' | 'EC' | 'DO';

export type VehicleType = 'CARS' | 'MOTOS' | 'BOTH';

export type BusinessType = 'PARTS_STORE' | 'WORKSHOP' | 'BOTH';

export type ThemeKey = 'turbo' | 'acero' | 'terreno';

export interface OnboardingState {
  country: CountryCode | null;
  vehicleType: VehicleType | null;
  businessType: BusinessType | null;
  theme: ThemeKey | null;
  completed: boolean;
}
