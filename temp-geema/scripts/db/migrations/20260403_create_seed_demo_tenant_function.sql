-- Función SECURITY DEFINER: re-seed de datos demo por tenant (invocada desde Edge reset-demo-tenant)
CREATE OR REPLACE FUNCTION public.seed_demo_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

-- ─── SALÓN GLAMOUR ────────────────────────────────────────────────────────
IF p_tenant_id = '725e6fcc-7372-4974-beea-7c78852ad609' THEN

  INSERT INTO public.service_categories (id, name, "order", color, icon) VALUES
    ('cat-salon-1', 'Cortes',       1, '#E91E8C', 'scissors'),
    ('cat-salon-2', 'Coloración',   2, '#9C27B0', 'droplet'),
    ('cat-salon-3', 'Tratamientos', 3, '#3D3D8F', 'star'),
    ('cat-salon-4', 'Peinados',     4, '#1565C0', 'wind')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.services (id, name, category_id, price, duration, is_active) VALUES
    ('svc-salon-01','Corte Dama',              'cat-salon-1', 45000,  45, true),
    ('svc-salon-02','Corte + Lavado + Secado', 'cat-salon-1', 75000,  75, true),
    ('svc-salon-03','Flequillo / Puntas',      'cat-salon-1', 25000,  20, true),
    ('svc-salon-04','Tinte Raíz',              'cat-salon-2', 90000,  90, true),
    ('svc-salon-05','Tinte Completo',          'cat-salon-2', 140000,120, true),
    ('svc-salon-06','Mechas Californianas',    'cat-salon-2', 180000,150, true),
    ('svc-salon-07','Balayage',               'cat-salon-2', 220000,180, true),
    ('svc-salon-08','Keratina Express',        'cat-salon-3', 120000, 90, true),
    ('svc-salon-09','Hidratación Profunda',    'cat-salon-3', 65000,  60, true),
    ('svc-salon-10','Botox Capilar',          'cat-salon-3', 150000,120, true),
    ('svc-salon-11','Peinado Novia',           'cat-salon-4', 200000,120, true),
    ('svc-salon-12','Recogido Fiesta',         'cat-salon-4', 85000,  60, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.clients (id, name, phone, email, notes) VALUES
    ('cli-s-01','Andrea Ramírez',  '+573001234501',null,              'Alérgica a amoniaco'),
    ('cli-s-02','Valeria Herrera', '+573001234502','valeria.h@email.com',null),
    ('cli-s-03','Carolina Gómez',  '+573001234503',null,              'VIP — descuento 10%'),
    ('cli-s-04','Tatiana López',   '+573001234504','tatiana.l@email.com',null),
    ('cli-s-05','Marcela Jiménez', '+573001234505',null,              null),
    ('cli-s-06','Xiomara Duarte',  '+573001234506',null,              'Prefiere turno mañana'),
    ('cli-s-07','Natalia Prado',   '+573001234507','natalia.p@email.com',null),
    ('cli-s-08','Melissa Vargas',  '+573001234508',null,              null),
    ('cli-s-09','Patricia Rojas',  '+573001234509',null,              'Cabello muy sensible'),
    ('cli-s-10','Juliana Castro',  '+573001234510','juliana.c@email.com',null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.inventory_items (id, name, type, category, quantity, min_stock, unit, price, cost) VALUES
    ('inv-s-01','Tinte Loreal 60ml',         'countable','productos', 24,5,'unidad',45000,22000),
    ('inv-s-02','Oxidante 20vol 1L',         'countable','productos',  8,3,'unidad',25000,12000),
    ('inv-s-03','Keratina Premium 500ml',    'countable','productos',  5,2,'unidad',90000,45000),
    ('inv-s-04','Tijeras Corte Profesional', 'countable','equipos',    3,1,'unidad',180000,90000),
    ('inv-s-05','Capa Corte Desechable',     'countable','insumos',  150,20,'unidad',800,400),
    ('inv-s-06','Papel Aluminio Rollo',      'countable','insumos',   12,3,'unidad',8000,4000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.appointments (id,client_id,client_name,client_phone,employee_id,service_id,date,duration,price,status,completed_at) VALUES
    ('apt-s-01','cli-s-01','Andrea Ramírez',  '+573001234501','emp-salon-1','svc-salon-04',NOW()-INTERVAL '15 days',90, 90000,'completed',NOW()-INTERVAL '15 days'),
    ('apt-s-02','cli-s-02','Valeria Herrera', '+573001234502','emp-salon-2','svc-salon-01',NOW()-INTERVAL '14 days',45, 45000,'completed',NOW()-INTERVAL '14 days'),
    ('apt-s-03','cli-s-03','Carolina Gómez',  '+573001234503','emp-salon-1','svc-salon-07',NOW()-INTERVAL '12 days',180,220000,'completed',NOW()-INTERVAL '12 days'),
    ('apt-s-04','cli-s-04','Tatiana López',   '+573001234504','emp-salon-2','svc-salon-09',NOW()-INTERVAL '10 days',60, 65000,'completed',NOW()-INTERVAL '10 days'),
    ('apt-s-05','cli-s-05','Marcela Jiménez', '+573001234505','emp-salon-1','svc-salon-05',NOW()-INTERVAL '8 days', 120,140000,'completed',NOW()-INTERVAL '8 days'),
    ('apt-s-06','cli-s-06','Xiomara Duarte',  '+573001234506','emp-salon-2','svc-salon-02',NOW()-INTERVAL '7 days',  75, 75000,'completed',NOW()-INTERVAL '7 days'),
    ('apt-s-07','cli-s-07','Natalia Prado',   '+573001234507','emp-salon-1','svc-salon-06',NOW()-INTERVAL '5 days', 150,180000,'completed',NOW()-INTERVAL '5 days'),
    ('apt-s-08','cli-s-08','Melissa Vargas',  '+573001234508','emp-salon-2','svc-salon-08',NOW()-INTERVAL '3 days',  90,120000,'completed',NOW()-INTERVAL '3 days'),
    ('apt-s-09','cli-s-09','Patricia Rojas',  '+573001234509','emp-salon-1','svc-salon-10',NOW()-INTERVAL '2 days', 120,150000,'completed',NOW()-INTERVAL '2 days'),
    ('apt-s-10','cli-s-10','Juliana Castro',  '+573001234510','emp-salon-2','svc-salon-01',NOW()-INTERVAL '1 day',   45, 45000,'completed',NOW()-INTERVAL '1 day'),
    ('apt-s-11','cli-s-01','Andrea Ramírez',  '+573001234501','emp-salon-1','svc-salon-04',NOW()+INTERVAL '1 day',   90, 90000,'scheduled',null),
    ('apt-s-12','cli-s-03','Carolina Gómez',  '+573001234503','emp-salon-2','svc-salon-07',NOW()+INTERVAL '2 days', 180,220000,'scheduled',null),
    ('apt-s-13','cli-s-05','Marcela Jiménez', '+573001234505','emp-salon-1','svc-salon-09',NOW()+INTERVAL '3 days',  60, 65000,'scheduled',null),
    ('apt-s-14','cli-s-02','Valeria Herrera', '+573001234502','emp-salon-3','svc-salon-11',NOW()+INTERVAL '4 days', 120,200000,'scheduled',null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.payments (id,appointment_id,amount,method,date,service_total) VALUES
    ('pay-s-01','apt-s-01', 90000,'transfer',NOW()-INTERVAL '15 days',90000),
    ('pay-s-02','apt-s-02', 45000,'cash',    NOW()-INTERVAL '14 days',45000),
    ('pay-s-03','apt-s-03',220000,'card',    NOW()-INTERVAL '12 days',220000),
    ('pay-s-04','apt-s-04', 65000,'cash',    NOW()-INTERVAL '10 days',65000),
    ('pay-s-05','apt-s-05',140000,'transfer',NOW()-INTERVAL '8 days', 140000),
    ('pay-s-06','apt-s-06', 75000,'cash',    NOW()-INTERVAL '7 days',  75000),
    ('pay-s-07','apt-s-07',180000,'card',    NOW()-INTERVAL '5 days', 180000),
    ('pay-s-08','apt-s-08',120000,'transfer',NOW()-INTERVAL '3 days', 120000),
    ('pay-s-09','apt-s-09',150000,'cash',    NOW()-INTERVAL '2 days', 150000),
    ('pay-s-10','apt-s-10', 45000,'cash',    NOW()-INTERVAL '1 day',   45000)
  ON CONFLICT (id) DO NOTHING;

-- ─── NAIL & GLOW SPA ──────────────────────────────────────────────────────
ELSIF p_tenant_id = '700d07ae-da7c-4b36-8ad3-12c2a7b66f10' THEN

  INSERT INTO public.service_categories (id, name, "order", color, icon) VALUES
    ('cat-nails-1','Uñas Manos',     1,'#00BCD4','hand'),
    ('cat-nails-2','Uñas Pies',      2,'#009688','feather'),
    ('cat-nails-3','Diseño Nail Art',3,'#4CAF50','pen-tool'),
    ('cat-nails-4','Tratamientos',   4,'#26C6DA','heart')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.services (id, name, category_id, price, duration, is_active) VALUES
    ('svc-nails-01','Manicure Clásico',        'cat-nails-1',25,45,true),
    ('svc-nails-02','Manicure Semipermanente', 'cat-nails-1',40,60,true),
    ('svc-nails-03','Uñas Acrílicas',         'cat-nails-1',65,90,true),
    ('svc-nails-04','Uñas en Gel',            'cat-nails-1',55,75,true),
    ('svc-nails-05','Pedicure Clásico',        'cat-nails-2',30,50,true),
    ('svc-nails-06','Pedicure Spa',           'cat-nails-2',50,70,true),
    ('svc-nails-07','Pedicure Semipermanente','cat-nails-2',45,65,true),
    ('svc-nails-08','Diseño por Uña',         'cat-nails-3', 5,15,true),
    ('svc-nails-09','Nail Art Completo',      'cat-nails-3',35,45,true),
    ('svc-nails-10','Glitter / Foil',         'cat-nails-3',15,20,true),
    ('svc-nails-11','Baño de Parafina',       'cat-nails-4',20,30,true),
    ('svc-nails-12','Exfoliación de Manos',   'cat-nails-4',18,25,true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.clients (id, name, phone, email, notes) VALUES
    ('cli-n-01','Romina Alvarado',  '+511901234501',null,                   'Uñas frágiles'),
    ('cli-n-02','Fiorella Quispe',  '+511901234502','fiorella.q@email.com', null),
    ('cli-n-03','Stephanie Chávez', '+511901234503',null,                   null),
    ('cli-n-04','Camila Ochoa',     '+511901234504','camila.o@email.com',   'VIP'),
    ('cli-n-05','Silvana Torres',   '+511901234505',null,                   null),
    ('cli-n-06','Milagros Paredes', '+511901234506',null,                   null),
    ('cli-n-07','Karla Mendoza',    '+511901234507','karla.m@email.com',    null),
    ('cli-n-08','Diana Flores',     '+511901234508',null,                   'Alérgica a acrílico'),
    ('cli-n-09','Priscila Salas',   '+511901234509',null,                   null),
    ('cli-n-10','Angie Villanueva', '+511901234510','angie.v@email.com',    null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.inventory_items (id, name, type, category, quantity, min_stock, unit, price, cost) VALUES
    ('inv-n-01','Esmalte Semipermanente',  'countable','productos',45,10,'unidad',35,18),
    ('inv-n-02','Acrílico Polvo Rosa 50g', 'countable','productos', 8, 3,'unidad',28,14),
    ('inv-n-03','Gel UV Construcción',     'countable','productos', 6, 2,'unidad',45,22),
    ('inv-n-04','Lamp UV/LED 48W',         'countable','equipos',   3, 1,'unidad',80,40),
    ('inv-n-05','Limas Desechables 100u',  'countable','insumos',   5, 2,'paquete',12,6),
    ('inv-n-06','Acetona 500ml',           'countable','insumos',  10, 3,'unidad', 8, 4)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.appointments (id,client_id,client_name,client_phone,employee_id,service_id,date,duration,price,status,completed_at) VALUES
    ('apt-n-01','cli-n-01','Romina Alvarado', '+511901234501','emp-nails-1','svc-nails-02',NOW()-INTERVAL '14 days',60,40,'completed',NOW()-INTERVAL '14 days'),
    ('apt-n-02','cli-n-02','Fiorella Quispe', '+511901234502','emp-nails-2','svc-nails-03',NOW()-INTERVAL '12 days',90,65,'completed',NOW()-INTERVAL '12 days'),
    ('apt-n-03','cli-n-03','Stephanie Chávez','+511901234503','emp-nails-1','svc-nails-05',NOW()-INTERVAL '10 days',50,30,'completed',NOW()-INTERVAL '10 days'),
    ('apt-n-04','cli-n-04','Camila Ochoa',    '+511901234504','emp-nails-2','svc-nails-04',NOW()-INTERVAL '8 days', 75,55,'completed',NOW()-INTERVAL '8 days'),
    ('apt-n-05','cli-n-05','Silvana Torres',  '+511901234505','emp-nails-1','svc-nails-09',NOW()-INTERVAL '6 days', 45,35,'completed',NOW()-INTERVAL '6 days'),
    ('apt-n-06','cli-n-06','Milagros Paredes','+511901234506','emp-nails-2','svc-nails-06',NOW()-INTERVAL '5 days', 70,50,'completed',NOW()-INTERVAL '5 days'),
    ('apt-n-07','cli-n-07','Karla Mendoza',   '+511901234507','emp-nails-1','svc-nails-02',NOW()-INTERVAL '3 days', 60,40,'completed',NOW()-INTERVAL '3 days'),
    ('apt-n-08','cli-n-08','Diana Flores',    '+511901234508','emp-nails-2','svc-nails-07',NOW()-INTERVAL '2 days', 65,45,'completed',NOW()-INTERVAL '2 days'),
    ('apt-n-09','cli-n-09','Priscila Salas',  '+511901234509','emp-nails-1','svc-nails-11',NOW()-INTERVAL '1 day',  30,20,'completed',NOW()-INTERVAL '1 day'),
    ('apt-n-10','cli-n-10','Angie Villanueva','+511901234510','emp-nails-2','svc-nails-03',NOW()-INTERVAL '1 day',  90,65,'completed',NOW()-INTERVAL '1 day'),
    ('apt-n-11','cli-n-01','Romina Alvarado', '+511901234501','emp-nails-1','svc-nails-04',NOW()+INTERVAL '1 day',  75,55,'scheduled',null),
    ('apt-n-12','cli-n-04','Camila Ochoa',    '+511901234504','emp-nails-2','svc-nails-09',NOW()+INTERVAL '2 days', 45,35,'scheduled',null),
    ('apt-n-13','cli-n-07','Karla Mendoza',   '+511901234507','emp-nails-1','svc-nails-02',NOW()+INTERVAL '3 days', 60,40,'scheduled',null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.payments (id,appointment_id,amount,method,date,service_total) VALUES
    ('pay-n-01','apt-n-01',40,'cash',    NOW()-INTERVAL '14 days',40),
    ('pay-n-02','apt-n-02',65,'card',    NOW()-INTERVAL '12 days',65),
    ('pay-n-03','apt-n-03',30,'cash',    NOW()-INTERVAL '10 days',30),
    ('pay-n-04','apt-n-04',55,'transfer',NOW()-INTERVAL '8 days', 55),
    ('pay-n-05','apt-n-05',35,'cash',    NOW()-INTERVAL '6 days', 35),
    ('pay-n-06','apt-n-06',50,'card',    NOW()-INTERVAL '5 days', 50),
    ('pay-n-07','apt-n-07',40,'cash',    NOW()-INTERVAL '3 days', 40),
    ('pay-n-08','apt-n-08',45,'transfer',NOW()-INTERVAL '2 days', 45),
    ('pay-n-09','apt-n-09',20,'cash',    NOW()-INTERVAL '1 day',  20),
    ('pay-n-10','apt-n-10',65,'card',    NOW()-INTERVAL '1 day',  65)
  ON CONFLICT (id) DO NOTHING;

-- ─── THE SHARP CUT ────────────────────────────────────────────────────────
ELSIF p_tenant_id = 'bf5d84dd-a1b1-4fa4-9349-2c811fa269f0' THEN

  INSERT INTO public.service_categories (id, name, "order", color, icon) VALUES
    ('cat-barber-1','Cortes',      1,'#FF5722','scissors'),
    ('cat-barber-2','Barba',       2,'#FF9800','feather'),
    ('cat-barber-3','Tratamientos',3,'#FFC107','droplet'),
    ('cat-barber-4','Combos',      4,'#FF7043','package')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.services (id, name, category_id, price, duration, is_active) VALUES
    ('svc-barber-01','Corte Clásico',         'cat-barber-1',120,30,true),
    ('svc-barber-02','Corte + Lavado',        'cat-barber-1',160,45,true),
    ('svc-barber-03','Corte Niño',           'cat-barber-1', 90,25,true),
    ('svc-barber-04','Fade / Degradado',      'cat-barber-1',140,35,true),
    ('svc-barber-05','Perfilado de Barba',    'cat-barber-2', 80,20,true),
    ('svc-barber-06','Afeitado Clásico',      'cat-barber-2',110,30,true),
    ('svc-barber-07','Barba + Toalla Caliente','cat-barber-2',130,35,true),
    ('svc-barber-08','Hidratación Capilar',   'cat-barber-3',100,30,true),
    ('svc-barber-09','Tinte de Barba',        'cat-barber-3', 90,25,true),
    ('svc-barber-10','Corte + Barba',         'cat-barber-4',190,55,true),
    ('svc-barber-11','Corte + Barba + Ceja',  'cat-barber-4',220,65,true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.clients (id, name, phone, email, notes) VALUES
    ('cli-b-01','Roberto Fuentes', '+521551234501',null,                    null),
    ('cli-b-02','Javier Moreno',   '+521551234502','javier.m@email.com',   'Cada 2 semanas'),
    ('cli-b-03','Luis Estrada',    '+521551234503',null,                    null),
    ('cli-b-04','Fernando Reyes',  '+521551234504',null,                    'VIP'),
    ('cli-b-05','Alejandro Cruz',  '+521551234505','alejandro.c@email.com', null),
    ('cli-b-06','Ricardo Ortiz',   '+521551234506',null,                    null),
    ('cli-b-07','Eduardo Núñez',   '+521551234507',null,                    null),
    ('cli-b-08','Gustavo Peña',    '+521551234508','gustavo.p@email.com',   null),
    ('cli-b-09','Raúl Medina',     '+521551234509',null,                    null),
    ('cli-b-10','Omar Delgado',    '+521551234510',null,                    null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.inventory_items (id, name, type, category, quantity, min_stock, unit, price, cost) VALUES
    ('inv-b-01','Maquina Wahl Clipper',    'countable','equipos',  4,2,'unidad',850,420),
    ('inv-b-02','Navajas Desechables 100u','countable','insumos',  8,3,'caja',  120, 60),
    ('inv-b-03','Gel Fijador 500ml',       'countable','productos',12,4,'unidad', 95, 48),
    ('inv-b-04','Crema de Afeitar 200ml',  'countable','productos',15,5,'unidad', 65, 32),
    ('inv-b-05','Toallas Desechables 100u','countable','insumos',  6,2,'paquete',180, 90),
    ('inv-b-06','Aceite Maquina Barbera',  'countable','productos', 5,2,'unidad', 45, 22)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.appointments (id,client_id,client_name,client_phone,employee_id,service_id,date,duration,price,status,completed_at) VALUES
    ('apt-b-01','cli-b-01','Roberto Fuentes', '+521551234501','emp-barber-1','svc-barber-10',NOW()-INTERVAL '14 days',55,190,'completed',NOW()-INTERVAL '14 days'),
    ('apt-b-02','cli-b-02','Javier Moreno',   '+521551234502','emp-barber-2','svc-barber-01',NOW()-INTERVAL '13 days',30,120,'completed',NOW()-INTERVAL '13 days'),
    ('apt-b-03','cli-b-03','Luis Estrada',    '+521551234503','emp-barber-1','svc-barber-04',NOW()-INTERVAL '11 days',35,140,'completed',NOW()-INTERVAL '11 days'),
    ('apt-b-04','cli-b-04','Fernando Reyes',  '+521551234504','emp-barber-2','svc-barber-11',NOW()-INTERVAL '9 days', 65,220,'completed',NOW()-INTERVAL '9 days'),
    ('apt-b-05','cli-b-05','Alejandro Cruz',  '+521551234505','emp-barber-1','svc-barber-07',NOW()-INTERVAL '7 days', 35,130,'completed',NOW()-INTERVAL '7 days'),
    ('apt-b-06','cli-b-06','Ricardo Ortiz',   '+521551234506','emp-barber-2','svc-barber-10',NOW()-INTERVAL '6 days', 55,190,'completed',NOW()-INTERVAL '6 days'),
    ('apt-b-07','cli-b-07','Eduardo Núñez',   '+521551234507','emp-barber-1','svc-barber-01',NOW()-INTERVAL '4 days', 30,120,'completed',NOW()-INTERVAL '4 days'),
    ('apt-b-08','cli-b-08','Gustavo Peña',    '+521551234508','emp-barber-2','svc-barber-06',NOW()-INTERVAL '3 days', 30,110,'completed',NOW()-INTERVAL '3 days'),
    ('apt-b-09','cli-b-09','Raúl Medina',     '+521551234509','emp-barber-1','svc-barber-04',NOW()-INTERVAL '2 days', 35,140,'completed',NOW()-INTERVAL '2 days'),
    ('apt-b-10','cli-b-10','Omar Delgado',    '+521551234510','emp-barber-2','svc-barber-10',NOW()-INTERVAL '1 day',  55,190,'completed',NOW()-INTERVAL '1 day'),
    ('apt-b-11','cli-b-02','Javier Moreno',   '+521551234502','emp-barber-1','svc-barber-10',NOW()+INTERVAL '1 day',  55,190,'scheduled',null),
    ('apt-b-12','cli-b-04','Fernando Reyes',  '+521551234504','emp-barber-2','svc-barber-11',NOW()+INTERVAL '2 days', 65,220,'scheduled',null),
    ('apt-b-13','cli-b-06','Ricardo Ortiz',   '+521551234506','emp-barber-1','svc-barber-04',NOW()+INTERVAL '3 days', 35,140,'scheduled',null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.payments (id,appointment_id,amount,method,date,service_total) VALUES
    ('pay-b-01','apt-b-01',190,'cash',    NOW()-INTERVAL '14 days',190),
    ('pay-b-02','apt-b-02',120,'cash',    NOW()-INTERVAL '13 days',120),
    ('pay-b-03','apt-b-03',140,'transfer',NOW()-INTERVAL '11 days',140),
    ('pay-b-04','apt-b-04',220,'card',    NOW()-INTERVAL '9 days', 220),
    ('pay-b-05','apt-b-05',130,'cash',    NOW()-INTERVAL '7 days', 130),
    ('pay-b-06','apt-b-06',190,'transfer',NOW()-INTERVAL '6 days', 190),
    ('pay-b-07','apt-b-07',120,'cash',    NOW()-INTERVAL '4 days', 120),
    ('pay-b-08','apt-b-08',110,'cash',    NOW()-INTERVAL '3 days', 110),
    ('pay-b-09','apt-b-09',140,'card',    NOW()-INTERVAL '2 days', 140),
    ('pay-b-10','apt-b-10',190,'transfer',NOW()-INTERVAL '1 day',  190)
  ON CONFLICT (id) DO NOTHING;

-- ─── AURA ESTÉTICA ────────────────────────────────────────────────────────
ELSIF p_tenant_id = 'e6704e01-2f1a-4da1-8d6d-600a1c243d5a' THEN

  INSERT INTO public.service_categories (id, name, "order", color, icon) VALUES
    ('cat-est-1','Facial',          1,'#673AB7','smile'),
    ('cat-est-2','Corporal',        2,'#3F51B5','activity'),
    ('cat-est-3','Cejas y Pestañas',3,'#2196F3','eye'),
    ('cat-est-4','Depilación',      4,'#E91E8C','zap')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.services (id, name, category_id, price, duration, is_active) VALUES
    ('svc-est-01','Limpieza Facial Básica',   'cat-est-1',35, 60,true),
    ('svc-est-02','Limpieza Facial Profunda', 'cat-est-1',55, 90,true),
    ('svc-est-03','Hidratación Facial',       'cat-est-1',45, 60,true),
    ('svc-est-04','Radiofrecuencia Facial',   'cat-est-1',80, 75,true),
    ('svc-est-05','Masaje Relajante',         'cat-est-2',50, 60,true),
    ('svc-est-06','Masaje Descontracturante', 'cat-est-2',65, 75,true),
    ('svc-est-07','Cavitación',              'cat-est-2',70, 60,true),
    ('svc-est-08','Vendas Frías Reductoras',  'cat-est-2',60, 60,true),
    ('svc-est-09','Diseño de Cejas',         'cat-est-3',18, 40,true),
    ('svc-est-10','Laminado de Cejas',        'cat-est-3',35, 60,true),
    ('svc-est-11','Extensiones Clásicas',     'cat-est-3',55,120,true),
    ('svc-est-12','Extensiones Volumen',      'cat-est-3',80,150,true),
    ('svc-est-13','Depilación Labio',         'cat-est-4', 8, 15,true),
    ('svc-est-14','Depilación Axilas',        'cat-est-4',12, 20,true),
    ('svc-est-15','Depilación Piernas',       'cat-est-4',30, 50,true),
    ('svc-est-16','Depilación Bikini',        'cat-est-4',25, 40,true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.clients (id, name, phone, email, notes) VALUES
    ('cli-e-01','Alejandra Soto',   '+584121234501',null,                    null),
    ('cli-e-02','Mariangel Blanco', '+584121234502','mariangel.b@email.com', 'VIP'),
    ('cli-e-03','Génesis Mora',     '+584121234503',null,                    'Primera visita'),
    ('cli-e-04','Daniela Suárez',   '+584121234504',null,                    null),
    ('cli-e-05','Rebeca Gil',       '+584121234505','rebeca.g@email.com',    null),
    ('cli-e-06','Lorena Rivas',     '+584121234506',null,                    null),
    ('cli-e-07','Adriana Campos',   '+584121234507',null,                    'Piel sensible'),
    ('cli-e-08','Katiuska Díaz',    '+584121234508','katiuska.d@email.com',  null),
    ('cli-e-09','Yolanda Freites',  '+584121234509',null,                    null),
    ('cli-e-10','Estefanía León',   '+584121234510',null,                    null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.inventory_items (id, name, type, category, quantity, min_stock, unit, price, cost) VALUES
    ('inv-e-01','Crema Despigmentante 50ml', 'countable','productos',10,3,'unidad',38,19),
    ('inv-e-02','Extensiones pelo mink 0.10','countable','productos',20,5,'bandeja',55,27),
    ('inv-e-03','Cera Depilatoria 500g',     'countable','productos', 8,3,'unidad',22,11),
    ('inv-e-04','Vendas No Tejidas 100u',    'countable','insumos',   5,2,'caja',  18, 9),
    ('inv-e-05','Mascarilla Hidratante 200g','countable','productos', 12,4,'unidad',30,15),
    ('inv-e-06','Adhesivo Pestañas 5ml',     'countable','productos',  8,3,'unidad',15, 7)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.appointments (id,client_id,client_name,client_phone,employee_id,service_id,date,duration,price,status,completed_at) VALUES
    ('apt-e-01','cli-e-01','Alejandra Soto',  '+584121234501','emp-est-1','svc-est-11',NOW()-INTERVAL '15 days',120,55,'completed',NOW()-INTERVAL '15 days'),
    ('apt-e-02','cli-e-02','Mariangel Blanco','+584121234502','emp-est-2','svc-est-02',NOW()-INTERVAL '13 days', 90,55,'completed',NOW()-INTERVAL '13 days'),
    ('apt-e-03','cli-e-03','Génesis Mora',    '+584121234503','emp-est-1','svc-est-05',NOW()-INTERVAL '11 days', 60,50,'completed',NOW()-INTERVAL '11 days'),
    ('apt-e-04','cli-e-04','Daniela Suárez',  '+584121234504','emp-est-2','svc-est-07',NOW()-INTERVAL '9 days',  60,70,'completed',NOW()-INTERVAL '9 days'),
    ('apt-e-05','cli-e-05','Rebeca Gil',      '+584121234505','emp-est-1','svc-est-12',NOW()-INTERVAL '8 days',  60,80,'completed',NOW()-INTERVAL '8 days'),
    ('apt-e-06','cli-e-06','Lorena Rivas',    '+584121234506','emp-est-2','svc-est-15',NOW()-INTERVAL '6 days',  50,30,'completed',NOW()-INTERVAL '6 days'),
    ('apt-e-07','cli-e-07','Adriana Campos',  '+584121234507','emp-est-1','svc-est-09',NOW()-INTERVAL '5 days',  40,18,'completed',NOW()-INTERVAL '5 days'),
    ('apt-e-08','cli-e-08','Katiuska Díaz',   '+584121234508','emp-est-2','svc-est-04',NOW()-INTERVAL '3 days',  75,80,'completed',NOW()-INTERVAL '3 days'),
    ('apt-e-09','cli-e-09','Yolanda Freites', '+584121234509','emp-est-1','svc-est-11',NOW()-INTERVAL '2 days', 120,55,'completed',NOW()-INTERVAL '2 days'),
    ('apt-e-10','cli-e-10','Estefanía León',  '+584121234510','emp-est-2','svc-est-16',NOW()-INTERVAL '1 day',   40,25,'completed',NOW()-INTERVAL '1 day'),
    ('apt-e-11','cli-e-01','Alejandra Soto',  '+584121234501','emp-est-1','svc-est-12',NOW()+INTERVAL '1 day',  150,80,'scheduled',null),
    ('apt-e-12','cli-e-02','Mariangel Blanco','+584121234502','emp-est-2','svc-est-02',NOW()+INTERVAL '2 days',  90,55,'scheduled',null),
    ('apt-e-13','cli-e-05','Rebeca Gil',      '+584121234505','emp-est-1','svc-est-07',NOW()+INTERVAL '3 days',  60,70,'scheduled',null)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.payments (id,appointment_id,amount,method,date,service_total) VALUES
    ('pay-e-01','apt-e-01',55,'transfer',NOW()-INTERVAL '15 days',55),
    ('pay-e-02','apt-e-02',55,'card',    NOW()-INTERVAL '13 days',55),
    ('pay-e-03','apt-e-03',50,'cash',    NOW()-INTERVAL '11 days',50),
    ('pay-e-04','apt-e-04',70,'transfer',NOW()-INTERVAL '9 days', 70),
    ('pay-e-05','apt-e-05',80,'card',    NOW()-INTERVAL '8 days', 80),
    ('pay-e-06','apt-e-06',30,'cash',    NOW()-INTERVAL '6 days', 30),
    ('pay-e-07','apt-e-07',18,'cash',    NOW()-INTERVAL '5 days', 18),
    ('pay-e-08','apt-e-08',80,'card',    NOW()-INTERVAL '3 days', 80),
    ('pay-e-09','apt-e-09',55,'transfer',NOW()-INTERVAL '2 days', 55),
    ('pay-e-10','apt-e-10',25,'cash',    NOW()-INTERVAL '1 day',  25)
  ON CONFLICT (id) DO NOTHING;

END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_tenant(uuid) TO service_role;
