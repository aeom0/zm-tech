alter table public.whatsapp_sessions drop constraint whatsapp_sessions_pkey;
alter table public.whatsapp_sessions add primary key (tenant_id, phone);
