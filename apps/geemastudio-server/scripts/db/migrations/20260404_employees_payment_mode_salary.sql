-- employees: payment_mode + salary_amount (alineado con packages/shared-schema)
-- Idempotente para entornos que ya tengan las columnas.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'payment_mode'
  ) THEN
    ALTER TABLE public.employees
      ADD COLUMN payment_mode text NOT NULL DEFAULT 'commission';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'salary_amount'
  ) THEN
    ALTER TABLE public.employees
      ADD COLUMN salary_amount numeric(10, 2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_payment_mode_check'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_payment_mode_check
      CHECK (payment_mode IN ('commission', 'salary', 'mixed'));
  END IF;
END $$;
