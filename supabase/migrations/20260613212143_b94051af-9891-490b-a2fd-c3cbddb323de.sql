
-- 1) Privilege escalation fix on user_roles UPDATE: WITH CHECK mora također zahtjevati admin u target org
DROP POLICY IF EXISTS "Admins update roles in org" ON public.user_roles;
CREATE POLICY "Admins update roles in org"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role_or_super(auth.uid(), 'admin'::app_role, organization_id)
  AND role <> 'superadmin'::app_role
)
WITH CHECK (
  public.has_role_or_super(auth.uid(), 'admin'::app_role, organization_id)
  AND role <> 'superadmin'::app_role
);

-- 2) Lock down claim_organization: bez auto-dodjele admin/accountant uloge.
-- Whitelist korisnici dobijaju uloge kroz handle_new_user trigger; ova funkcija sad samo
-- prebacuje aktivnu organizaciju ako je korisnik već član (ili superadmin).
CREATE OR REPLACE FUNCTION public.claim_organization(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text;
  _is_super boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT public.is_superadmin(_uid) INTO _is_super;

  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = _uid
    AND (organization_id = _org_id OR role = 'superadmin'::app_role)
  ORDER BY CASE WHEN organization_id = _org_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF _role IS NULL AND NOT _is_super THEN
    RAISE EXCEPTION 'Nemate ovlasti za pristup ovoj organizaciji. Obratite se administratoru.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.profiles
     SET active_organization_id = _org_id,
         organization_id = COALESCE(organization_id, _org_id)
   WHERE id = _uid;

  PERFORM public.log_action('claim_org', 'organization', _org_id,
    jsonb_build_object('role', COALESCE(_role, 'superadmin')));

  RETURN COALESCE(_role, 'superadmin');
END $$;

-- 3) Error log INSERT: ne dozvoljavamo NULL user_id od strane autentificiranog korisnika
DROP POLICY IF EXISTS "Insert own errors" ON public.error_log;
CREATE POLICY "Insert own errors"
ON public.error_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4) Revoke EXECUTE on log_client_error from anon (treba auth)
REVOKE EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text, jsonb) TO authenticated;
