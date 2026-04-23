-- Fix claim_organization: ako korisnik već ima organizaciju ali nema rolu, dodijeli rolu
CREATE OR REPLACE FUNCTION public.claim_organization(_org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _existing_org UUID;
  _has_role BOOLEAN;
  _admin_count INT;
  _assigned_role public.app_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT organization_id INTO _existing_org FROM public.profiles WHERE id = _uid;

  -- Ako već ima drugu organizaciju, blokiraj
  IF _existing_org IS NOT NULL AND _existing_org <> _org_id THEN
    RAISE EXCEPTION 'Already member of another organization';
  END IF;

  -- Ako nema org, dodijeli
  IF _existing_org IS NULL THEN
    UPDATE public.profiles SET organization_id = _org_id WHERE id = _uid;
  END IF;

  -- Provjeri ima li već rolu u toj org
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles WHERE user_id = _uid AND organization_id = _org_id
  ) INTO _has_role;

  IF _has_role THEN
    SELECT role::TEXT INTO _assigned_role FROM public.user_roles
     WHERE user_id = _uid AND organization_id = _org_id LIMIT 1;
    RETURN _assigned_role::TEXT;
  END IF;

  -- Odredi rolu
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
$function$;

-- Dodijeli admin rolu trenutnom korisniku direktor@idss.ba za njegovu organizaciju (IMH)
INSERT INTO public.user_roles (user_id, role, organization_id)
SELECT p.id, 'admin'::app_role, p.organization_id
FROM public.profiles p
WHERE p.id = '82bff184-2fcb-4d93-b38f-4fdf08f3d0d4'
  AND p.organization_id IS NOT NULL
ON CONFLICT (user_id, role, organization_id) DO NOTHING;