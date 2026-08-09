-- Seed catálogo demo RepMAX
-- Exportado desde llacowjutjfefboqgfnj (2026-08-09)
-- Requiere tiendas con slug: repuestos-alfa, repuestos-beta
--
-- Uso (SQL Editor / psql / MCP execute_sql):
--   1. Asegurar que existan repmax_stores con esos slugs
--   2. Ejecutar este archivo
--
-- Idempotente por id: re-ejecutar actualiza filas existentes.
-- NO toca contacts, quote_leads ni odental_*.

BEGIN;

-- repuestos-alfa (20 productos)
INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'cd8b5bb2-2ecd-4df0-9eb0-a0f80077fdfb'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Kit de arrastre',
  'Piñón, corona y cadena',
  'Bera',
  'BR200',
  2018,
  2022,
  'MOTO'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'BR-KA-18221',
  45,
  1642.5,
  5,
  1,
  ARRAY['https://picsum.photos/seed/alfa-arrastre-1/800/600', 'https://picsum.photos/seed/alfa-arrastre-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '675c084e-2c77-4490-b21a-36375d8117ce'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Batería 12V 60Ah',
  'Batería de arranque libre de mantenimiento',
  'Bosch',
  'S4',
  2005,
  2023,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'BOSCH-S4-60',
  95,
  3467.5,
  5,
  1,
  ARRAY['https://picsum.photos/seed/alfa-bateria-1/800/600', 'https://picsum.photos/seed/alfa-bateria-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'e2b95bcd-8b45-479b-8f79-ca6263fcef80'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Correa de distribución',
  'Correa dentada de distribución',
  'Chevrolet',
  'Spark',
  2013,
  2018,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'CH-CD-13182',
  28,
  1022,
  10,
  2,
  ARRAY['https://picsum.photos/seed/alfa-correa-1/800/600', 'https://picsum.photos/seed/alfa-correa-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'dc77b60b-0008-43aa-a476-a22657b4a9e2'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Espejo retrovisor izquierdo',
  'Espejo retrovisor eléctrico',
  'Chevrolet',
  'Aveo',
  2010,
  2016,
  'CAR'::repmax_vehicle_type,
  'USED'::repmax_part_condition,
  'CH-ES-10165',
  18,
  657,
  3,
  1,
  ARRAY['https://picsum.photos/seed/alfa-espejo-1/800/600', 'https://picsum.photos/seed/alfa-espejo-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '75a323d8-6e73-49a0-b6c1-93a4acb9a238'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Filtro de aire',
  'Filtro de aire de motor',
  'Chevrolet',
  'Aveo',
  2010,
  2016,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'CH-FA-10165',
  9,
  328.5,
  20,
  3,
  ARRAY['https://picsum.photos/seed/alfa-filtro-aire-1/800/600', 'https://picsum.photos/seed/alfa-filtro-aire-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '49e0c2e6-3077-4084-9b39-63956d541594'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Radiador',
  'Radiador de aluminio nuevo',
  'Chevrolet',
  'Optra',
  2007,
  2012,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'CH-RA-07122',
  110,
  4015,
  3,
  1,
  ARRAY['https://picsum.photos/seed/alfa-radiador-1/800/600', 'https://picsum.photos/seed/alfa-radiador-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '42ef4b97-4776-4d9d-a3df-49095b8b3a70'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Cadena 428H',
  'Cadena de transmisión reforzada',
  'Empire Keeway',
  'TTO125',
  2019,
  2023,
  'MOTO'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'EK-CD-19231',
  22,
  803,
  9,
  2,
  ARRAY['https://picsum.photos/seed/alfa-cadena-1/800/600', 'https://picsum.photos/seed/alfa-cadena-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '53ed8767-c207-48cc-b9fc-c35c01720193'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Alternador',
  'Alternador reacondicionado',
  'Ford',
  'Explorer',
  2015,
  2020,
  'SUV'::repmax_vehicle_type,
  'USED'::repmax_part_condition,
  'FO-AL-15201',
  95,
  3467.5,
  2,
  1,
  ARRAY['https://picsum.photos/seed/alfa-alternador-1/800/600', 'https://picsum.photos/seed/alfa-alternador-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'a2ca1167-ba56-4202-92a8-edd046454e49'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Amortiguador delantero',
  'Amortiguador delantero derecho/izquierdo',
  'Ford',
  'Fiesta',
  2011,
  2017,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'FO-AM-11172',
  42,
  1533,
  7,
  2,
  ARRAY['https://picsum.photos/seed/alfa-amortiguador-1/800/600', 'https://picsum.photos/seed/alfa-amortiguador-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '88baaf1d-7962-4145-ae58-c028fbb1d8d2'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Discos de freno delanteros',
  'Par de discos de freno ventilados',
  'Ford',
  'Explorer',
  2015,
  2020,
  'SUV'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'FO-DF-15201',
  65,
  2372.5,
  6,
  2,
  ARRAY['https://picsum.photos/seed/alfa-discos-1/800/600', 'https://picsum.photos/seed/alfa-discos-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'ac256a93-0efb-4f47-ad39-b3f62e9c204e'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Kit de embrague',
  'Kit completo: disco, plato y collarín',
  'Ford',
  'Fiesta',
  2010,
  2016,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'FO-KE-10161',
  85,
  3102.5,
  4,
  1,
  ARRAY['https://picsum.photos/seed/alfa-embrague-1/800/600', 'https://picsum.photos/seed/alfa-embrague-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '588e69d9-64ef-458b-a479-14114b105582'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Aceite de motor sintético 4L',
  'Aceite sintético 5W-30',
  'Mobil',
  'Super3000',
  2000,
  2023,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'MOB-AC-5W30',
  32,
  1168,
  25,
  5,
  ARRAY['https://picsum.photos/seed/alfa-aceite-1/800/600', 'https://picsum.photos/seed/alfa-aceite-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '4f88ab0a-4778-4f7b-900d-fcc8b8ce52f5'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Bujía NGK (inactivo)',
  NULL,
  'NGK',
  'Iridium',
  NULL,
  NULL,
  NULL,
  'NEW'::repmax_part_condition,
  NULL,
  8,
  NULL,
  5,
  1,
  NULL,
  false
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '4175d717-b500-4d5c-a0c4-3b58ae8f1830'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Bujías Iridium x4',
  'Juego de 4 bujías de iridio',
  'NGK',
  'Iridium',
  2010,
  2023,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'NGK-IR-4PK',
  32,
  1168,
  12,
  3,
  ARRAY['https://picsum.photos/seed/alfa-bujias-1/800/600', 'https://picsum.photos/seed/alfa-bujias-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'f4357bf8-ab9d-49f2-9df5-a3baa8863e13'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Bomba de agua',
  'Bomba de agua con empaque incluido',
  'Toyota',
  'Yaris',
  2015,
  2020,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'TY-BA-15201',
  34,
  1241,
  6,
  2,
  ARRAY['https://picsum.photos/seed/alfa-bomba-1/800/600', 'https://picsum.photos/seed/alfa-bomba-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '9d009d7c-fcaa-4658-a028-3f2f4795eee9'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Faro delantero derecho',
  'Faro delantero lado derecho',
  'Toyota',
  'Corolla',
  2014,
  2019,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'TY-FD-14192',
  55,
  2007.5,
  4,
  1,
  ARRAY['https://picsum.photos/seed/alfa-faro-1/800/600', 'https://picsum.photos/seed/alfa-faro-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'e4dda93f-d71c-4ef4-9875-df661e1d8d1d'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Filtro aceite Toyota',
  NULL,
  'Toyota',
  'Corolla',
  NULL,
  NULL,
  NULL,
  'NEW'::repmax_part_condition,
  NULL,
  25,
  NULL,
  10,
  1,
  NULL,
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'db8b7ca6-13b8-42d6-8fed-371b8157a874'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Filtro de aceite',
  'Filtro de aceite de alta filtración',
  'Toyota',
  'Corolla',
  2014,
  2019,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'TY-OF-14192',
  12.5,
  456.25,
  15,
  2,
  ARRAY['https://picsum.photos/seed/alfa-filtro-aceite-1/800/600', 'https://picsum.photos/seed/alfa-filtro-aceite-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'f1069934-760e-44ba-9cfe-9374d5210db4'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Parachoques delantero',
  'Parachoques delantero usado en buen estado',
  'Toyota',
  'Hilux',
  2016,
  2022,
  'TRUCK'::repmax_vehicle_type,
  'USED'::repmax_part_condition,
  'TY-PC-16221',
  120,
  4380,
  2,
  1,
  ARRAY['https://picsum.photos/seed/alfa-parachoques-1/800/600', 'https://picsum.photos/seed/alfa-parachoques-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '4d3ac523-ad47-4492-bd67-8314cbe44ab8'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-alfa'),
  'Pastillas de freno delanteras',
  'Juego de pastillas de freno delanteras',
  'Toyota',
  'Hilux',
  2016,
  2022,
  'TRUCK'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'TY-PF-16221',
  38,
  1387,
  8,
  2,
  ARRAY['https://picsum.photos/seed/alfa-pastillas-1/800/600', 'https://picsum.photos/seed/alfa-pastillas-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

-- repuestos-beta (19 productos)
INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '98887918-7023-4402-83fb-7d2dbdffe012'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Batería 12V 70Ah',
  'Batería de arranque de alto rendimiento',
  'Bosch',
  'S5',
  2005,
  2023,
  'TRUCK'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'BOSCH-S5-70',
  105,
  3832.5,
  4,
  1,
  ARRAY['https://picsum.photos/seed/beta-bateria-1/800/600', 'https://picsum.photos/seed/beta-bateria-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '706f9111-fe1e-4478-a6ec-7db360ca5b4c'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Kit de arrastre',
  'Piñón, corona y cadena',
  'Empire Keeway',
  'TTX150',
  2020,
  2023,
  'MOTO'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'EK-KA-20231',
  48,
  1752,
  4,
  1,
  ARRAY['https://picsum.photos/seed/beta-arrastre-1/800/600', 'https://picsum.photos/seed/beta-arrastre-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '4f5fa2d0-9611-4990-9c51-fc1a2ac8fc9f'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Discos de freno traseros',
  'Par de discos de freno sólidos',
  'Ford',
  'Ranger',
  2015,
  2021,
  'TRUCK'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'FO-DF-15212',
  58,
  2117,
  5,
  1,
  ARRAY['https://picsum.photos/seed/beta-discos-1/800/600', 'https://picsum.photos/seed/beta-discos-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '0dbd472c-d77e-452e-ac67-458456fd7e29'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Parachoques trasero',
  'Parachoques trasero usado en buen estado',
  'Ford',
  'Ranger',
  2015,
  2021,
  'TRUCK'::repmax_vehicle_type,
  'USED'::repmax_part_condition,
  'FO-PC-15212',
  110,
  4015,
  2,
  1,
  ARRAY['https://picsum.photos/seed/beta-parachoques-1/800/600', 'https://picsum.photos/seed/beta-parachoques-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '11523a41-d80f-4772-8921-5e0e095e4283'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Pastillas de freno traseras',
  'Juego de pastillas de freno traseras',
  'Ford',
  'Ranger',
  2015,
  2021,
  'TRUCK'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'FO-PF-15211',
  35,
  1277.5,
  9,
  2,
  ARRAY['https://picsum.photos/seed/beta-pastillas-1/800/600', 'https://picsum.photos/seed/beta-pastillas-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'b285168a-bee0-4582-8caa-712ae197e6de'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Pastillas freno Ford',
  NULL,
  'Ford',
  'Ranger',
  NULL,
  NULL,
  NULL,
  'NEW'::repmax_part_condition,
  NULL,
  45,
  NULL,
  4,
  1,
  NULL,
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'ff11fcaa-da6e-4c4a-92d2-946edc25b81b'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Alternador',
  'Alternador reacondicionado',
  'Hyundai',
  'Elantra',
  2011,
  2016,
  'CAR'::repmax_vehicle_type,
  'USED'::repmax_part_condition,
  'HY-AL-11162',
  85,
  3102.5,
  2,
  1,
  ARRAY['https://picsum.photos/seed/beta-alternador-1/800/600', 'https://picsum.photos/seed/beta-alternador-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'f203daa5-c1b7-4262-9941-885427c0edfe'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Faro delantero izquierdo',
  'Faro delantero lado izquierdo, usado',
  'Hyundai',
  'Tucson',
  2016,
  2021,
  'SUV'::repmax_vehicle_type,
  'USED'::repmax_part_condition,
  'HY-FD-16211',
  60,
  2190,
  3,
  1,
  ARRAY['https://picsum.photos/seed/beta-faro-1/800/600', 'https://picsum.photos/seed/beta-faro-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '26333b7e-60eb-4321-941c-2e906a06962e'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Filtro de combustible',
  'Filtro de combustible en línea',
  'Hyundai',
  'Tucson',
  2016,
  2021,
  'SUV'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'HY-FC-16211',
  16,
  584,
  14,
  3,
  ARRAY['https://picsum.photos/seed/beta-filtrocomb-1/800/600', 'https://picsum.photos/seed/beta-filtrocomb-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'd1c773d7-f67d-4a16-b496-70e8d6ae42d0'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Radiador',
  'Radiador de aluminio nuevo',
  'Hyundai',
  'Elantra',
  2011,
  2016,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'HY-RA-11162',
  98,
  3577,
  3,
  1,
  ARRAY['https://picsum.photos/seed/beta-radiador-1/800/600', 'https://picsum.photos/seed/beta-radiador-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '7c3411dd-2cd1-411a-b665-4d720abb7aaf'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Amortiguador trasero',
  'Amortiguador trasero derecho/izquierdo',
  'Kia',
  'Sportage',
  2014,
  2020,
  'SUV'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'KI-AM-14201',
  48,
  1752,
  6,
  2,
  ARRAY['https://picsum.photos/seed/beta-amortiguador-1/800/600', 'https://picsum.photos/seed/beta-amortiguador-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '08eeb5ff-1731-479b-a1e8-90c5517a7d20'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Espejo retrovisor derecho',
  'Espejo retrovisor eléctrico',
  'Kia',
  'Rio',
  2012,
  2018,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'KI-ES-12181',
  22,
  803,
  5,
  1,
  ARRAY['https://picsum.photos/seed/beta-espejo-1/800/600', 'https://picsum.photos/seed/beta-espejo-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'd0725edb-1e16-45e5-9793-2ae551bbadb0'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Filtro de aire',
  'Filtro de aire de alto flujo',
  'Kia',
  'Rio',
  2012,
  2018,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'KI-FA-12181',
  9.5,
  346.75,
  18,
  3,
  ARRAY['https://picsum.photos/seed/beta-filtroaire-1/800/600', 'https://picsum.photos/seed/beta-filtroaire-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'd9604007-0ff5-425d-a416-fb088a72c906'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Kit de embrague',
  'Kit completo: disco, plato y collarín',
  'Kia',
  'Rio',
  2012,
  2018,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'KI-KE-12181',
  78,
  2847,
  4,
  1,
  ARRAY['https://picsum.photos/seed/beta-embrague-1/800/600', 'https://picsum.photos/seed/beta-embrague-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'be1baff6-b066-464e-813f-11e9514843d1'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Aceite de motor mineral 4L',
  'Aceite mineral 20W-50',
  'Mobil',
  'Special',
  2000,
  2023,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'MOB-AC-20W50',
  18,
  657,
  22,
  5,
  ARRAY['https://picsum.photos/seed/beta-aceite-1/800/600', 'https://picsum.photos/seed/beta-aceite-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'f3c3b6cd-3701-4641-bcc4-0bc6d1fd9d1f'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Bujías Iridium x4',
  'Juego de 4 bujías de iridio',
  'NGK',
  'Iridium',
  2010,
  2023,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'NGK-IR-4PKB',
  32,
  1168,
  10,
  3,
  ARRAY['https://picsum.photos/seed/beta-bujias-1/800/600', 'https://picsum.photos/seed/beta-bujias-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'ed2b9d0e-aeb1-491a-8b94-e8e7d3aaf9fd'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Bomba de agua',
  'Bomba de agua con empaque incluido',
  'Nissan',
  'Versa',
  2014,
  2019,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'NI-BA-14191',
  30,
  1095,
  7,
  2,
  ARRAY['https://picsum.photos/seed/beta-bomba-1/800/600', 'https://picsum.photos/seed/beta-bomba-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  '4864ac56-4474-4229-8f9f-e3b0fadf96ef'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Correa de accesorios',
  'Correa poly-V de accesorios',
  'Nissan',
  'Sentra',
  2013,
  2019,
  'CAR'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'NI-CA-13191',
  19,
  693.5,
  11,
  2,
  ARRAY['https://picsum.photos/seed/beta-correa-1/800/600', 'https://picsum.photos/seed/beta-correa-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

INSERT INTO public.repmax_products (
  id, store_id, title, description, brand, model,
  year_from, year_to, vehicle_type, condition, part_number,
  price_usd, price_bs, stock, min_stock, photos, is_active
)
VALUES (
  'b5c9bbf9-48d2-45ae-a784-ca2a88c35617'::uuid,
  (SELECT id FROM public.repmax_stores WHERE slug = 'repuestos-beta'),
  'Cadena 520',
  'Cadena de transmisión reforzada',
  'Suzuki',
  'GN125',
  2015,
  2020,
  'MOTO'::repmax_vehicle_type,
  'NEW'::repmax_part_condition,
  'SZ-CD-15201',
  20,
  730,
  10,
  2,
  ARRAY['https://picsum.photos/seed/beta-cadena-1/800/600', 'https://picsum.photos/seed/beta-cadena-2/800/600']::text[],
  true
)
ON CONFLICT (id) DO UPDATE SET
  store_id     = EXCLUDED.store_id,
  title        = EXCLUDED.title,
  description  = EXCLUDED.description,
  brand        = EXCLUDED.brand,
  model        = EXCLUDED.model,
  year_from    = EXCLUDED.year_from,
  year_to      = EXCLUDED.year_to,
  vehicle_type = EXCLUDED.vehicle_type,
  condition    = EXCLUDED.condition,
  part_number  = EXCLUDED.part_number,
  price_usd    = EXCLUDED.price_usd,
  price_bs     = EXCLUDED.price_bs,
  stock        = EXCLUDED.stock,
  min_stock    = EXCLUDED.min_stock,
  photos       = EXCLUDED.photos,
  is_active    = EXCLUDED.is_active;

COMMIT;
