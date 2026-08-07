-- Hub ZM Tech — hardening helpers (advisor security)
-- Aplicada en remoto como hub_rls_harden_helpers

alter function public.hub_set_updated_at() set search_path = public;

revoke all on function public.hub_is_member() from public, anon;
revoke all on function public.hub_is_founder() from public, anon;
grant execute on function public.hub_is_member() to authenticated;
grant execute on function public.hub_is_founder() to authenticated;
