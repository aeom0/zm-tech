-- =============================================================================
-- SalonPro — Empleados/as de ejemplo (datos ficticios genéricos)
-- =============================================================================
-- Este archivo es un TEMPLATE genérico. Reemplaza los nombres, colores y
-- porcentajes con los datos reales de tu equipo.
--
-- ESQUEMA DE COMISIONES:
--   commission_percentage = porcentaje que recibe el/la empleado/a
--   El resto (100 - commission_percentage) queda para la casa/negocio
--
-- Ejecutar con: psql -U usuario -d nombre_bd -f scripts/db/seed-employees-template.sql
-- =============================================================================

-- Limpiar empleados existentes
DELETE FROM employees;

-- =============================================================================
-- Inserta aquí a tu equipo.
-- IDs: usa slugs descriptivos (ej. 'emp-ana', 'emp-carlos')
-- Colores: elige uno por persona para identificarla en el calendario
-- commission_percentage: porcentaje que recibe el/la empleado/a (0-100)
-- role: 'owner' (dueño/a) o 'employee' (personal)
-- =============================================================================

INSERT INTO employees (id, name, phone, color, role, commission_percentage, notes, is_active) VALUES

-- Dueño/a del negocio
-- Cuando trabaja directamente: recibe el 100%
-- Cuando trabajan empleados/as: recibe la diferencia (100 - commission_percentage del empleado)
('emp-propietario', 'Propietario/a', NULL, '#6C3483', 'owner', 100,
 'Dueño/a — recibe 100% cuando trabaja directamente.', true),

-- Empleado/a 1
('emp-uno', 'Empleado/a 1', NULL, '#1A5276', 'employee', 60,
 'Personal — esquema 60% empleado/a / 40% casa.', true),

-- Empleado/a 2
('emp-dos', 'Empleado/a 2', NULL, '#117A65', 'employee', 60,
 'Personal — esquema 60% empleado/a / 40% casa.', true),

-- Empleado/a 3 (ejemplo con comisión diferente)
('emp-tres', 'Empleado/a 3', NULL, '#7D6608', 'employee', 50,
 'Personal — esquema 50% empleado/a / 50% casa.', true);

-- =============================================================================
-- Colores sugeridos (uno por persona):
--   Violeta oscuro  #6C3483
--   Azul marino     #1A5276
--   Verde oscuro    #117A65
--   Dorado          #7D6608
--   Rosa            #922B21
--   Celeste         #0E6655
--   Naranja         #935116
--   Gris azulado    #2E4057
-- =============================================================================

-- Verificar inserción
SELECT
  name,
  color,
  role,
  commission_percentage || '%' AS comision,
  CASE
    WHEN role = 'owner' THEN 'Cuando trabaja: 100%'
    ELSE commission_percentage || '% empleado/a / ' || (100 - commission_percentage) || '% casa'
  END AS esquema
FROM employees
ORDER BY
  CASE WHEN role = 'owner' THEN 0 ELSE 1 END,
  name;
