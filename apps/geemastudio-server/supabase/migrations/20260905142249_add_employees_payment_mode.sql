alter table public.employees
  add column payment_mode text check (payment_mode in ('commission', 'salary', 'mixed'));

update public.employees set payment_mode = 'salary' where id in ('emp-vanessa', 'emp-sthefani');
update public.employees set payment_mode = 'commission' where id in ('emp-karelis', 'emp-alejandra');
