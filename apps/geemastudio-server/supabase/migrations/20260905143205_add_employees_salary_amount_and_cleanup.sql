alter table public.employees
  add column salary_amount numeric(10,2);

update public.employees
  set commission_percentage = 0
  where id in ('emp-vanessa', 'emp-sthefani') and payment_mode = 'salary';
