-- Script para poblar servicios de ZM Lash & Nails Beauty
-- Basado en LISTA DE PRECIOS ZM | Precios S/ 20 - S/ 320
-- Ejecutar con: psql -U zmlash -d zm_lash_nails -f scripts/seed-services.sql

-- Limpiar datos existentes
DELETE FROM services;
DELETE FROM service_categories;

-- Categorías: Extensiones de Pestañas, Lifting, Cejas y Rostro, Uñas, Microblading, Depilación
INSERT INTO service_categories (id, name, "order") VALUES
('cat-extensiones', 'Extensiones de Pestañas', 1),
('cat-lifting', 'Lifting', 2),
('cat-cejas-rostro', 'Cejas y Rostro', 3),
('cat-unas', 'Uñas', 4),
('cat-microblading', 'Microblading', 5),
('cat-depilacion', 'Depilación', 6);

-- ========================================
-- EXTENSIONES DE PESTAÑAS
-- ========================================
INSERT INTO services (name, category_id, price, duration, is_active) VALUES
('Clásicas', 'cat-extensiones', 100.00, 120, true),
('Rimel', 'cat-extensiones', 100.00, 120, true),
('Mojado', 'cat-extensiones', 120.00, 150, true),
('Baby Volumen Tecnológica', 'cat-extensiones', 160.00, 180, true),
('Volumen Russo Tecnológica', 'cat-extensiones', 200.00, 210, true),
('Retoque Clásicas / Rimel', 'cat-extensiones', 70.00, 90, true),
('Retoque Mojado', 'cat-extensiones', 80.00, 90, true),
('Retoque Baby Volumen Tecnológico', 'cat-extensiones', 100.00, 120, true),
('Retoque Volumen Russo Tecnológico', 'cat-extensiones', 130.00, 120, true),
-- Promoción Yape/Plin
('Clásicas / Rimel (Promo)', 'cat-extensiones', 90.00, 120, true),
('Clásicas + Bozo (Promo)', 'cat-extensiones', 110.00, 135, true),
('Rimel + Bozo (Promo)', 'cat-extensiones', 110.00, 135, true);

-- ========================================
-- LIFTING
-- ========================================
INSERT INTO services (name, category_id, price, duration, is_active) VALUES
('Lifting de Pestañas', 'cat-lifting', 60.00, 60, true),
('Lifting + Tinturado', 'cat-lifting', 80.00, 75, true),
('Lifting + Diseño y Planchado de Cejas', 'cat-lifting', 160.00, 120, true),
('Lifting + Diseño y Tinturado de Cejas', 'cat-lifting', 160.00, 120, true),
('2 Lifting + Tinturado (Promo Yape/Plin)', 'cat-lifting', 100.00, 150, true),
('Lifting + Diseño y Planchado Cejas (Promo)', 'cat-lifting', 140.00, 120, true),
('Lifting + Diseño y Tinturado (Promo)', 'cat-lifting', 140.00, 120, true);

-- ========================================
-- CEJAS Y ROSTRO
-- ========================================
INSERT INTO services (name, category_id, price, duration, is_active) VALUES
('Depilación de Cejas', 'cat-cejas-rostro', 25.00, 20, true),
('Diseño de Cejas + Depilación', 'cat-cejas-rostro', 55.00, 40, true),
('Diseño + Depilación + Tinturado Cejas', 'cat-cejas-rostro', 90.00, 60, true),
('Diseño + Depilación + Laminado Cejas', 'cat-cejas-rostro', 90.00, 60, true),
('Depilación de Rostro Completo', 'cat-cejas-rostro', 70.00, 45, true),
('Depilación de Rostro (Promo Yape/Plin)', 'cat-cejas-rostro', 50.00, 45, true),
('Depilación de Bozo', 'cat-cejas-rostro', 35.00, 15, true),
('Bozo (Promo Yape/Plin)', 'cat-cejas-rostro', 20.00, 15, true);

-- ========================================
-- UÑAS
-- ========================================
INSERT INTO services (name, category_id, price, duration, is_active) VALUES
('Manicure en Gel', 'cat-unas', 55.00, 60, true),
('Rubber Base', 'cat-unas', 80.00, 75, true),
('Polly Gel - Nuevo Set', 'cat-unas', 90.00, 90, true),
('Polly Gel - Retoque', 'cat-unas', 75.00, 75, true),
('Soft Gel - Nuevo Set', 'cat-unas', 90.00, 90, true),
('Soft Gel - Retoque', 'cat-unas', 75.00, 75, true),
('Pedicure Clásico', 'cat-unas', 45.00, 50, true),
('Pedicure en Gel', 'cat-unas', 60.00, 60, true),
('Diseño Básico', 'cat-unas', 20.00, 15, true),
('Diseño Híbrido', 'cat-unas', 25.00, 20, true),
('Retiro', 'cat-unas', 20.00, 30, true),
-- Packs Especiales (Lunes-Miércoles, Yape/Plin)
('Pack: Manos + Pies en Gel', 'cat-unas', 85.00, 120, true),
('Pack: Rubber + Pedigel', 'cat-unas', 100.00, 135, true),
('Pack: Soft Gel + Pedigel', 'cat-unas', 120.00, 150, true),
('Pack: Polly Gel + Pedigel', 'cat-unas', 120.00, 150, true),
-- Promo Aurora (Jueves-Viernes-Sábado)
('Rubber - Promo Aurora', 'cat-unas', 78.00, 75, true),
('Soft Gel - Promo Aurora', 'cat-unas', 98.00, 90, true),
('Polly Gel - Promo Aurora', 'cat-unas', 98.00, 90, true);

-- ========================================
-- MICROBLADING
-- ========================================
INSERT INTO services (name, category_id, price, duration, is_active) VALUES
('Microblading de Cejas', 'cat-microblading', 300.00, 150, true),
('Shading de Cejas', 'cat-microblading', 320.00, 150, true),
('Microlips (Labios)', 'cat-microblading', 300.00, 150, true),
('Hidra Lips', 'cat-microblading', 130.00, 60, true);

-- ========================================
-- DEPILACIÓN
-- ========================================
INSERT INTO services (name, category_id, price, duration, is_active) VALUES
('Depilación de Axilas', 'cat-depilacion', 30.00, 20, true),
('Depilación Bikini Full Brasileña', 'cat-depilacion', 70.00, 45, true),
('Depilación Pierna Completa', 'cat-depilacion', 75.00, 60, true),
('Depilación Media Pierna', 'cat-depilacion', 40.00, 35, true),
('Depilación Línea del Ombligo', 'cat-depilacion', 25.00, 15, true),
-- Packs (Lunes-Miércoles, Yape/Plin)
('Pack: Abdomen + Axilas', 'cat-depilacion', 50.00, 40, true),
('Pack: Bikini Full + Media Pierna', 'cat-depilacion', 100.00, 80, true),
('Pack: Pierna Completa + Abdomen', 'cat-depilacion', 90.00, 80, true),
('Pack: Bikini Full + Axilas', 'cat-depilacion', 90.00, 65, true);

-- Verificar inserción
SELECT
  sc.name as categoria,
  COUNT(s.id) as total_servicios,
  MIN(s.price::numeric) as precio_min,
  MAX(s.price::numeric) as precio_max
FROM service_categories sc
LEFT JOIN services s ON s.category_id = sc.id
GROUP BY sc.id, sc.name, sc."order"
ORDER BY sc."order";
