-- Onboarding mobile: agrega las preferencias elegidas en el flujo de
-- onboarding (pais, enfoque de vehiculo, tema visual, tipo de negocio)
-- a repmax_stores. Antes de esta migracion, OnboardingContext las
-- persistia solo en AsyncStorage del dispositivo y se perdian al crear
-- la cuenta real.
-- Alcance: SOLO repmax_stores (no tocar odental_*, hub_*, contacts, quote_leads)
-- Proyecto: llacowjutjfefboqgfnj

ALTER TABLE public.repmax_stores
  ADD COLUMN store_type text NOT NULL DEFAULT 'repuesteria'
    CHECK (store_type IN ('repuesteria', 'taller', 'ambos')),
  ADD COLUMN vehicle_focus text NOT NULL DEFAULT 'BOTH'
    CHECK (vehicle_focus IN ('CARS', 'MOTOS', 'BOTH')),
  ADD COLUMN theme_key text NOT NULL DEFAULT 'turbo'
    CHECK (theme_key IN ('turbo', 'acero', 'terreno')),
  ADD COLUMN country_code text NOT NULL DEFAULT 'VE'
    CHECK (country_code IN ('VE', 'CO', 'PE', 'EC', 'DO'));

COMMENT ON COLUMN public.repmax_stores.store_type IS
  'Elegido en OnboardingBusiness. Reutilizado por el modulo taller (storeType) cuando se implemente.';
COMMENT ON COLUMN public.repmax_stores.vehicle_focus IS
  'Elegido en OnboardingVehicle.';
COMMENT ON COLUMN public.repmax_stores.theme_key IS
  'Elegido en OnboardingTheme. Determina el color de acento del dashboard.';
COMMENT ON COLUMN public.repmax_stores.country_code IS
  'Elegido en OnboardingCountry. Referencia para expansion LATAM.';
