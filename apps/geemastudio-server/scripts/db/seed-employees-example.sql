-- Script para agregar empleadas de ZM Lash & Nails Beauty
-- Ejecutar con: psql -U zmlash -d zm_lash_nails -f scripts/seed-employees.sql

-- Limpiar empleadas existentes
DELETE FROM employees;

-- Agregar empleadas con roles y comisiones
INSERT INTO employees (id, name, phone, color, role, commission_percentage, notes, is_active) VALUES
-- Dueña (Vanessa)
-- Cuando trabaja: 100% para ella
-- Cuando trabajan empleadas: 40% para casa (Vanessa)
-- Cubre insumos, arriendo y arbitrios
('emp-vanessa', 'Vanessa', NULL, '#D4AF37', 'owner', 100,
 'Dueña - Cuando trabaja recibe 100%. Cuando trabajan empleadas recibe 40%. Cubre insumos, arriendo y arbitrios.', true),

-- Empleadas: 60% empleada / 40% casa (Vanessa)
('emp-sthefani', 'Sthefani', NULL, '#9B59B6', 'employee', 60,
 'Empleada - Esquema: 60% empleada / 40% casa (Vanessa).', true),
('emp-romina', 'Romina', NULL, '#E91E63', 'employee', 60,
 'Empleada - Esquema: 60% empleada / 40% casa (Vanessa).', true),
('emp-yosaida', 'Yosaida', NULL, '#00BCD4', 'employee', 60,
 'Empleada - Esquema: 60% empleada / 40% casa (Vanessa).', true);

-- Verificar inserción
SELECT
  name,
  color,
  role,
  commission_percentage || '%' as comision,
  CASE
    WHEN role = 'owner' THEN 'Cuando trabaja: 100%. Casa recibe 40% de empleadas'
    ELSE 'Recibe 60%, casa (Vanessa) 40%'
  END as esquema
FROM employees
ORDER BY
  CASE WHEN role = 'owner' THEN 0 ELSE 1 END,
  name;
