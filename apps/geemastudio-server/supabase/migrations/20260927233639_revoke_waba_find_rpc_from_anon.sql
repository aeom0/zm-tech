-- Sprint 4 follow-up: CREATE FUNCTION hereda EXECUTE para anon/authenticated
-- vía default privileges. REVOKE FROM PUBLIC no los quita.
REVOKE EXECUTE ON FUNCTION public.waba_find_silent_phones(text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_find_idle_browse_phones(text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_find_ads_bounce_phones(text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.waba_find_quality_review_candidates(text, int, int, int, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.waba_find_silent_phones(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.waba_find_idle_browse_phones(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.waba_find_ads_bounce_phones(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.waba_find_quality_review_candidates(text, int, int, int, boolean) TO service_role;
