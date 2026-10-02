ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS commission_mode text NOT NULL DEFAULT 'percent';

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS house_cut_fixed integer;

COMMENT ON COLUMN public.employees.commission_mode IS
  'percent = commission_percentage; fixed_house = casa retiene house_cut_fixed por línea, profesional el resto';
COMMENT ON COLUMN public.employees.house_cut_fixed IS
  'Soles fijos que retiene la casa (Vanessa) por línea cuando commission_mode = fixed_house';

INSERT INTO public.employees (
  id, name, email, phone, color, role,
  commission_percentage, commission_mode, house_cut_fixed,
  notes, is_active, created_at
)
SELECT
  'emp-karelis',
  'Karelis',
  email,
  phone,
  COALESCE(NULLIF(color, ''), '#FF9800'),
  role,
  COALESCE(commission_percentage, 40),
  'percent',
  NULL,
  'Extensiones Anime/Fox/Hawaiana/Mega Volumen/Wispy — desde 1 PM Lima. Destajo 40%.',
  is_active,
  created_at
FROM public.employees
WHERE id = 'emp-romina'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  notes = EXCLUDED.notes,
  commission_percentage = EXCLUDED.commission_percentage,
  commission_mode = 'percent',
  is_active = EXCLUDED.is_active;

UPDATE public.appointments
SET employee_id = 'emp-karelis'
WHERE employee_id = 'emp-romina';

UPDATE public.payments
SET employee_id = 'emp-karelis'
WHERE employee_id = 'emp-romina';

UPDATE public.appointment_services
SET employee_id = 'emp-karelis'
WHERE employee_id = 'emp-romina';

UPDATE public.profiles
SET employee_id = 'emp-karelis'
WHERE employee_id = 'emp-romina';

DELETE FROM public.employees WHERE id = 'emp-romina';

INSERT INTO public.employees (
  id, name, color, role,
  commission_percentage, commission_mode, house_cut_fixed,
  notes, is_active
) VALUES (
  'emp-alejandra',
  'Alejandra',
  '#9C27B0',
  'employee',
  0,
  'fixed_house',
  50,
  'Microblading, Microshading, Shading, Delineado de ojos, Microlips. Casa S/50 fijo; ella recibe el resto del precio cliente.',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  commission_mode = 'fixed_house',
  house_cut_fixed = 50,
  notes = EXCLUDED.notes,
  is_active = true;

UPDATE public.employees
SET
  name = 'Karelis',
  commission_mode = COALESCE(commission_mode, 'percent'),
  is_active = true,
  notes = COALESCE(
    NULLIF(notes, ''),
    'Extensiones Anime/Fox/Hawaiana/Mega Volumen/Wispy — desde 1 PM Lima. Destajo 40%.'
  )
WHERE id = 'emp-karelis';
