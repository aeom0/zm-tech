-- =============================================================================
-- SalonPro — Servicios de ejemplo por tipo de negocio
-- =============================================================================
-- Este archivo es un TEMPLATE genérico. Edítalo con los servicios reales
-- de tu negocio antes de ejecutarlo.
--
-- Descomenta el bloque correspondiente a tu tipo de negocio:
--   1. Spa / Uñas (spa-nails)
--   2. Barbería (barbershop)
--   3. Peluquería / Salón de Estilo (hair-salon)
--   4. Estética Integral (full-aesthetic)
--
-- Ejecutar con: psql -U usuario -d nombre_bd -f scripts/db/seed-services-template.sql
-- O desde el proyecto: yarn db:seed (ajusta run-seeds.js primero)
-- =============================================================================

-- Limpiar datos existentes (comentar si no deseas limpiar)
DELETE FROM services;
DELETE FROM service_categories;


-- =============================================================================
-- OPCIÓN 1: SPA / UÑAS (spa-nails)
-- =============================================================================

INSERT INTO service_categories (id, name, "order") VALUES
('cat-unas',       'Uñas',              1),
('cat-pestanas',   'Pestañas',          2),
('cat-cejas',      'Cejas y Rostro',    3),
('cat-depilacion', 'Depilación',        4);

INSERT INTO services (name, category_id, price, duration, is_active) VALUES
-- Uñas
('Manicure en Gel',        'cat-unas', 50.00,  60, true),
('Uñas en Acrílico',       'cat-unas', 80.00,  90, true),
('Uñas en Gel (Nuevo Set)','cat-unas', 85.00,  90, true),
('Uñas en Gel (Retoque)',  'cat-unas', 70.00,  75, true),
('Pedicure Clásico',       'cat-unas', 40.00,  50, true),
('Pedicure en Gel',        'cat-unas', 55.00,  60, true),
('Diseño de Uñas',         'cat-unas', 20.00,  20, true),
('Retiro de Uñas',         'cat-unas', 20.00,  30, true),
-- Pestañas
('Extensiones Clásicas',         'cat-pestanas', 90.00,  120, true),
('Extensiones Volumen Ruso',     'cat-pestanas', 180.00, 210, true),
('Lifting de Pestañas',          'cat-pestanas', 60.00,   60, true),
('Lifting + Tinturado',          'cat-pestanas', 75.00,   75, true),
('Retoque Extensiones Clásicas', 'cat-pestanas', 60.00,   90, true),
-- Cejas y Rostro
('Diseño de Cejas',              'cat-cejas', 45.00, 40, true),
('Diseño + Tinturado de Cejas',  'cat-cejas', 70.00, 55, true),
('Depilación de Bozo',           'cat-cejas', 30.00, 15, true),
-- Depilación
('Depilación de Axilas',         'cat-depilacion', 30.00, 20, true),
('Depilación Bikini',            'cat-depilacion', 60.00, 40, true),
('Depilación Pierna Completa',   'cat-depilacion', 70.00, 60, true);


-- =============================================================================
-- OPCIÓN 2: BARBERÍA (barbershop)
-- Descomenta este bloque y comenta el bloque anterior para usarlo
-- =============================================================================

-- INSERT INTO service_categories (id, name, "order") VALUES
-- ('cat-corte',     'Cortes',              1),
-- ('cat-barba',     'Barba y Bigote',      2),
-- ('cat-tratamientos', 'Tratamientos',     3),
-- ('cat-color',     'Color y Tintura',     4);
--
-- INSERT INTO services (name, category_id, price, duration, is_active) VALUES
-- -- Cortes
-- ('Corte de Cabello Clásico',   'cat-corte', 25.00, 30, true),
-- ('Corte + Barba',              'cat-corte', 40.00, 50, true),
-- ('Corte + Degradado',         'cat-corte', 35.00, 40, true),
-- ('Corte Infantil (hasta 10)',  'cat-corte', 20.00, 25, true),
-- -- Barba y Bigote
-- ('Afeitado Clásico con Navaja','cat-barba', 20.00, 25, true),
-- ('Perfilado de Barba',         'cat-barba', 15.00, 20, true),
-- ('Diseño de Barba',            'cat-barba', 25.00, 30, true),
-- ('Tratamiento de Barba',       'cat-barba', 35.00, 40, true),
-- -- Tratamientos
-- ('Hidratación Capilar',        'cat-tratamientos', 30.00, 30, true),
-- ('Keratina Express',           'cat-tratamientos', 60.00, 60, true),
-- ('Tratamiento Anticaída',      'cat-tratamientos', 45.00, 45, true),
-- -- Color
-- ('Tinte Completo',             'cat-color', 50.00, 75, true),
-- ('Mechas / Luces',             'cat-color', 70.00, 90, true),
-- ('Decoloración',               'cat-color', 80.00, 90, true);


-- =============================================================================
-- OPCIÓN 3: PELUQUERÍA / SALÓN DE ESTILO (hair-salon)
-- Descomenta este bloque y comenta los anteriores para usarlo
-- =============================================================================

-- INSERT INTO service_categories (id, name, "order") VALUES
-- ('cat-corte',       'Cortes',            1),
-- ('cat-color',       'Color',             2),
-- ('cat-tratamiento', 'Tratamientos',      3),
-- ('cat-peinado',     'Peinados',          4);
--
-- INSERT INTO services (name, category_id, price, duration, is_active) VALUES
-- -- Cortes
-- ('Corte de Cabello Mujer',     'cat-corte', 35.00, 40, true),
-- ('Corte de Cabello Hombre',    'cat-corte', 25.00, 30, true),
-- ('Corte + Lavado + Secado',    'cat-corte', 55.00, 60, true),
-- ('Corte Infantil',             'cat-corte', 20.00, 25, true),
-- -- Color
-- ('Tinte Completo',             'cat-color', 70.00,  90, true),
-- ('Mechas / Balayage',          'cat-color', 120.00, 120, true),
-- ('Retoque de Color',           'cat-color', 55.00,  75, true),
-- ('Ombre / Degradado',          'cat-color', 100.00, 120, true),
-- -- Tratamientos
-- ('Keratina Brasileña',         'cat-tratamiento', 150.00, 120, true),
-- ('Hidratación Intensiva',      'cat-tratamiento',  45.00,  45, true),
-- ('Botox Capilar',              'cat-tratamiento',  80.00,  60, true),
-- -- Peinados
-- ('Peinado para Evento',        'cat-peinado', 60.00,  60, true),
-- ('Trenzas',                    'cat-peinado', 50.00,  60, true),
-- ('Brushing / Blow Dry',        'cat-peinado', 35.00,  40, true);


-- =============================================================================
-- OPCIÓN 4: ESTÉTICA INTEGRAL (full-aesthetic)
-- Descomenta este bloque y comenta los anteriores para usarlo
-- =============================================================================

-- INSERT INTO service_categories (id, name, "order") VALUES
-- ('cat-facial',     'Tratamientos Faciales', 1),
-- ('cat-corporal',   'Tratamientos Corporales',2),
-- ('cat-unas',       'Uñas',                  3),
-- ('cat-cabello',    'Cabello',                4),
-- ('cat-depilacion', 'Depilación',             5);
--
-- INSERT INTO services (name, category_id, price, duration, is_active) VALUES
-- -- Facial
-- ('Limpieza Facial Profunda',   'cat-facial', 60.00,  60, true),
-- ('Facial Hidratante',          'cat-facial', 70.00,  60, true),
-- ('Peeling Químico',            'cat-facial', 80.00,  50, true),
-- ('Microdermoabrasión',         'cat-facial', 90.00,  60, true),
-- ('Tratamiento Antiedad',       'cat-facial', 100.00, 75, true),
-- -- Corporal
-- ('Masaje Relajante 60 min',    'cat-corporal', 70.00,  60, true),
-- ('Masaje Descontracturante',   'cat-corporal', 80.00,  60, true),
-- ('Envolvimiento Corporal',     'cat-corporal', 90.00,  75, true),
-- ('Reducción de Celulitis',     'cat-corporal', 85.00,  60, true),
-- -- Uñas
-- ('Manicure en Gel',            'cat-unas', 50.00, 60, true),
-- ('Pedicure en Gel',            'cat-unas', 55.00, 60, true),
-- -- Cabello
-- ('Corte + Lavado',             'cat-cabello', 45.00,  50, true),
-- ('Keratina Express',           'cat-cabello', 120.00, 90, true),
-- -- Depilación
-- ('Depilación Corporal Zona',   'cat-depilacion', 40.00, 30, true),
-- ('Depilación con Cera Completa','cat-depilacion', 80.00, 60, true);


-- Verificar inserción
SELECT
  sc.name AS categoria,
  COUNT(s.id) AS total_servicios,
  MIN(s.price::numeric) AS precio_min,
  MAX(s.price::numeric) AS precio_max
FROM service_categories sc
LEFT JOIN services s ON s.category_id = sc.id
GROUP BY sc.id, sc.name, sc."order"
ORDER BY sc."order";
