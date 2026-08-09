-- Fix: bootstrap owner en repmax_store_users
-- El NOT EXISTS sobre la misma tabla re-disparaba RLS → "infinite recursion".
-- Helper SECURITY DEFINER evita la recursión (mismo patrón que repmax_user_store_ids).
-- Alcance: SOLO helpers/policies repmax_* 

CREATE OR REPLACE FUNCTION public.repmax_store_has_members(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.repmax_store_users
    WHERE store_id = p_store_id
  );
$$;

REVOKE ALL ON FUNCTION public.repmax_store_has_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repmax_store_has_members(uuid) TO authenticated;

DROP POLICY IF EXISTS "repmax_store_users_insert" ON public.repmax_store_users;
CREATE POLICY "repmax_store_users_insert"
  ON public.repmax_store_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND role = 'owner'
      AND NOT public.repmax_store_has_members(store_id)
    )
    OR public.repmax_user_role_in_store(store_id) = 'owner'
  );
