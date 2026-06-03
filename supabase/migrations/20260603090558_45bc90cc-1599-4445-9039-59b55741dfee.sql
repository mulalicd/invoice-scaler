-- A7: Revoke EXECUTE od authenticated/anon na čistim helper funkcijama koje koristi samo RLS
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role_or_super(uuid, public.app_role, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role_in_org(uuid, public.app_role, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member_of_org(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_org(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_organization(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_action(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- A10: User_roles UPDATE — admin ne smije ni "vidjeti" red sa superadminom kao kandidata za izmjenu
DROP POLICY IF EXISTS "Admins update roles in org" ON public.user_roles;
CREATE POLICY "Admins update roles in org"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    has_role_or_super(auth.uid(), 'admin'::app_role, organization_id)
    AND role <> 'superadmin'::app_role
  )
  WITH CHECK (role <> 'superadmin'::app_role);

-- A10b: User_roles DELETE — analogno, admin ne smije obrisati superadmin ulogu
DROP POLICY IF EXISTS "Admins delete roles in org" ON public.user_roles;
CREATE POLICY "Admins delete roles in org"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    has_role_or_super(auth.uid(), 'admin'::app_role, organization_id)
    AND role <> 'superadmin'::app_role
  );

-- A9: Profili — suzi update tako da admin može mijenjati samo "soft" polja (first/last name, must_change_password),
-- a samo vlasnik može mijenjati svoja vlastita polja. Email i id ostaju nepromjenjivi kroz API.
-- Uvodimo trigger koji blokira promjenu zaštićenih kolona kroz authenticated rolu.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role i superadmin smiju sve (npr. seed funkcija)
  IF current_user = 'service_role' OR public.is_superadmin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Promjena id nije dozvoljena';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Promjena email-a nije dozvoljena kroz aplikaciju';
  END IF;
  -- Organization_id i active_organization_id smije mijenjati samo vlasnik profila
  IF (NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.active_organization_id IS DISTINCT FROM OLD.active_organization_id)
     AND auth.uid() <> OLD.id THEN
    RAISE EXCEPTION 'Samo vlasnik može mijenjati svoju aktivnu organizaciju';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();