
-- ============= SAFE PUBLIC VIEW for onboarding =============
-- Sigurnosno-definirani RPC koji vraća samo NEosjetljiva polja (id, code, name, full_name)
-- za prijavljenog korisnika, dok pune detalje vidi samo član organizacije.

CREATE OR REPLACE FUNCTION public.get_organizations_for_onboarding()
RETURNS TABLE(id UUID, code TEXT, name TEXT, full_name TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, code, name, full_name FROM public.organizations ORDER BY code;
$$;

-- Skidamo previše permisivnu select policy
DROP POLICY IF EXISTS "Authenticated can list organizations" ON public.organizations;

-- Vraćamo strogu policy: samo članovi vide svoju organizaciju (sa svim poljima)
CREATE POLICY "Members view own organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_organization(auth.uid()));

-- ============= ORG-SCOPED ROLE CHECK =============
-- Sprečava da admin u jednoj organizaciji ima admin prava nad drugom.
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id UUID, _role public.app_role, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND organization_id = _org_id
  )
$$;

-- Update policies da koriste org-scoped check
DROP POLICY IF EXISTS "Admins update own organization" ON public.organizations;
CREATE POLICY "Admins update own organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.get_user_organization(auth.uid())
         AND public.has_role_in_org(auth.uid(), 'admin', id));

DROP POLICY IF EXISTS "Admins insert organizations" ON public.organizations;
-- Niko više ne može insert-ati organizacije iz aplikacije (seed-ane su sistemski).

DROP POLICY IF EXISTS "Admins update org profiles" ON public.profiles;
CREATE POLICY "Admins update org profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid())
         AND public.has_role_in_org(auth.uid(), 'admin', organization_id));

DROP POLICY IF EXISTS "Admins see roles in org" ON public.user_roles;
CREATE POLICY "Admins see roles in org" ON public.user_roles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid())
         AND public.has_role_in_org(auth.uid(), 'admin', organization_id));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin', organization_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin', organization_id));

DROP POLICY IF EXISTS "Org admins delete clients" ON public.clients;
CREATE POLICY "Org admins delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid())
         AND public.has_role_in_org(auth.uid(), 'admin', organization_id));

DROP POLICY IF EXISTS "Org admins delete invoices" ON public.invoices;
CREATE POLICY "Org admins delete invoices" ON public.invoices
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid())
         AND public.has_role_in_org(auth.uid(), 'admin', organization_id));
