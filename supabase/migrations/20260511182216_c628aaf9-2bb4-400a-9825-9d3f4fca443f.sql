
-- 1) must_change_password kolona
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- 2) Backfill za 3 ovlaštena korisnika
UPDATE public.profiles
SET must_change_password = true
WHERE lower(email) IN ('mulalic.davor@outlook.com','financije@idss.ba','mehmed.s@poslovnost.ba');

-- 3) Osiguraj trigger na auth.users -> handle_new_user (whitelist enforcement)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) RPC: admin_set_user_role (idempotentno; viewer/admin smije postavljati admin/superadmin)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  _user_id uuid, _org_id uuid, _role app_role, _grant boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Samo superadmin može dodjeljivati/oduzimati superadmin ulogu
  IF _role = 'superadmin' AND NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'Only superadmin can manage superadmin role';
  END IF;

  -- Za ostale uloge: superadmin ili admin u toj organizaciji
  IF _role <> 'superadmin' AND NOT public.has_role_or_super(auth.uid(), 'admin', _org_id) THEN
    RAISE EXCEPTION 'Admin role required for this organization';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (_user_id, _role,
      CASE WHEN _role = 'superadmin' THEN NULL ELSE _org_id END)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (organization_id = _org_id OR (_role = 'superadmin' AND organization_id IS NULL));
  END IF;

  PERFORM public.log_action(
    CASE WHEN _grant THEN 'grant_role' ELSE 'revoke_role' END,
    'user_role', _user_id,
    jsonb_build_object('role', _role, 'org', _org_id)
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, uuid, app_role, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, uuid, app_role, boolean) TO authenticated;
