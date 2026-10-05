-- Pagos en bolívares (tenants VE). payments.amount sigue en la moneda del tenant
-- (USD) para que los reportes no cambien; un pago en Bs guarda además el monto en
-- Bs y la tasa usada (snapshot), de modo que el valor histórico no se recalcula.

alter table public.payments
  add column paid_currency text check (paid_currency in ('USD', 'VES')),
  add column exchange_rate numeric(10, 4) check (exchange_rate is null or exchange_rate > 0),
  add column amount_ves numeric(14, 2) check (amount_ves is null or amount_ves > 0),
  add constraint payments_ves_requires_rate check (amount_ves is null or exchange_rate is not null);

comment on column public.payments.paid_currency is
  'Moneda en que el cliente pagó (solo tenants VE). NULL en tenants sin conversión.';
comment on column public.payments.exchange_rate is
  'Bs por USD usados al registrar el pago (snapshot BCV o manual).';
comment on column public.payments.amount_ves is
  'Monto pagado en Bs cuando paid_currency = VES; amount queda en USD (amount_ves / exchange_rate).';
