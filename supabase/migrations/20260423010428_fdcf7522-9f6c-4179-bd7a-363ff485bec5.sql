
-- Strict insert/update guard for user_roles: only admins can grant roles, and ONLY to users in the same org
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins insert roles for org members" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_in_org(auth.uid(), 'admin', organization_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.organization_id = user_roles.organization_id
    )
  );

CREATE POLICY "Admins update roles for org members" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin', organization_id));

CREATE POLICY "Admins delete roles in org" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id));

-- Onboarding self-claim: korisnik bez organizacije sam pridružuje sebe.
-- Funkcija atomski:
--  1) postavlja profile.organization_id (samo ako je trenutno NULL)
--  2) dodjeljuje 'accountant' ulogu, ili 'admin' ako organizacija još nema admina
CREATE OR REPLACE FUNCTION public.claim_organization(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _existing_org UUID;
  _admin_count INT;
  _assigned_role public.app_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT organization_id INTO _existing_org FROM public.profiles WHERE id = _uid;
  IF _existing_org IS NOT NULL THEN
    RAISE EXCEPTION 'Already member of an organization';
  END IF;

  -- assign organization
  UPDATE public.profiles SET organization_id = _org_id WHERE id = _uid;

  -- decide role: first user in org becomes admin, others are accountants
  SELECT COUNT(*) INTO _admin_count FROM public.user_roles
   WHERE organization_id = _org_id AND role = 'admin';

  IF _admin_count = 0 THEN
    _assigned_role := 'admin';
  ELSE
    _assigned_role := 'accountant';
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_uid, _assigned_role, _org_id)
  ON CONFLICT (user_id, role, organization_id) DO NOTHING;

  RETURN _assigned_role::TEXT;
END;
$$;

-- Eksplicitno blokira pisanje u counters tabelu kroz API; dozvoljen samo SECURITY DEFINER funkciji
CREATE POLICY "Block direct counter writes" ON public.invoice_counters
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "Block direct counter updates" ON public.invoice_counters
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "Block direct counter deletes" ON public.invoice_counters
  FOR DELETE TO authenticated USING (false);
