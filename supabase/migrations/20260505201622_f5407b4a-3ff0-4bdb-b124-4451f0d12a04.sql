
-- ========================================
-- 2) Profili: dodaj active_organization_id (zamjena za organization_id)
-- ========================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS active_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill iz starog organization_id
UPDATE public.profiles SET active_organization_id = organization_id WHERE active_organization_id IS NULL;

-- ========================================
-- 3) Audit log
-- ========================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  organization_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4) Helper funkcije (SECURITY DEFINER, search_path locked)
-- ========================================

-- Provjera da li je korisnik član organizacije (postoji bilo koja rola)
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'superadmin'
  );
$$;

-- Da li je superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin');
$$;

-- Da li ima specifičnu ulogu u organizaciji (uključujući superadmin)
CREATE OR REPLACE FUNCTION public.has_role_or_super(_user_id uuid, _role app_role, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND organization_id = _org_id);
$$;

-- Aktivna organizacija
CREATE OR REPLACE FUNCTION public.get_active_org(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active_organization_id FROM public.profiles WHERE id = _user_id;
$$;

-- Audit helper
CREATE OR REPLACE FUNCTION public.log_action(_action text, _entity_type text, _entity_id uuid, _details jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.audit_log (user_id, user_email, organization_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _email, public.get_active_org(auth.uid()), _action, _entity_type, _entity_id, _details);
END $$;

-- ========================================
-- 5) RLS update — sve tabele koriste novi multi-org model
-- ========================================

-- ORGANIZATIONS: vidi org u kojoj si član ili superadmin
DROP POLICY IF EXISTS "Members view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins update own organization" ON public.organizations;
CREATE POLICY "View orgs you belong to" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), id));
CREATE POLICY "Admins/super update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role_or_super(auth.uid(), 'admin', id));
CREATE POLICY "Superadmin insert org" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

-- PROFILES: vidi profile u bilo kojoj svojoj org; superadmin vidi sve
DROP POLICY IF EXISTS "Users view profiles in same org" ON public.profiles;
DROP POLICY IF EXISTS "Admins update org profiles" ON public.profiles;
CREATE POLICY "View profiles in shared org" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur1, public.user_roles ur2
      WHERE ur1.user_id = auth.uid() AND ur2.user_id = profiles.id
        AND ur1.organization_id = ur2.organization_id
    )
  );
CREATE POLICY "Admins update profiles in their org" ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur1, public.user_roles ur2
      WHERE ur1.user_id = auth.uid() AND ur1.role IN ('admin','superadmin')
        AND ur2.user_id = profiles.id AND ur2.organization_id = ur1.organization_id
    )
  );

-- USER_ROLES
DROP POLICY IF EXISTS "Admins see roles in org" ON public.user_roles;
DROP POLICY IF EXISTS "Admins insert roles for org members" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles for org members" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles in org" ON public.user_roles;
CREATE POLICY "Admins see roles in org" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role_or_super(auth.uid(), 'admin', organization_id));
CREATE POLICY "Admins manage roles in org" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_super(auth.uid(), 'admin', organization_id) AND role <> 'superadmin');
CREATE POLICY "Admins update roles in org" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role_or_super(auth.uid(), 'admin', organization_id))
  WITH CHECK (role <> 'superadmin');
CREATE POLICY "Admins delete roles in org" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role_or_super(auth.uid(), 'admin', organization_id));

-- CLIENTS — koristi active org
DROP POLICY IF EXISTS "Org members view clients" ON public.clients;
DROP POLICY IF EXISTS "Org members insert clients" ON public.clients;
DROP POLICY IF EXISTS "Org members update clients" ON public.clients;
DROP POLICY IF EXISTS "Org admins delete clients" ON public.clients;
CREATE POLICY "View clients in member org" ON public.clients FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Insert clients in active org" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_active_org(auth.uid()) AND public.is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Update clients in member org" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Admin delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.has_role_or_super(auth.uid(), 'admin', organization_id));

-- INVOICES
DROP POLICY IF EXISTS "Org members view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Org members insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Org members update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Org admins delete invoices" ON public.invoices;
CREATE POLICY "View invoices in member org" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Insert invoices in active org" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_active_org(auth.uid()) AND public.is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Update invoices in member org" ON public.invoices FOR UPDATE TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Admin delete invoices" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_role_or_super(auth.uid(), 'admin', organization_id));

-- INVOICE_ITEMS
DROP POLICY IF EXISTS "Org members view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Org members manage invoice items" ON public.invoice_items;
CREATE POLICY "Manage invoice items in member org" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.is_member_of_org(auth.uid(), i.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND public.is_member_of_org(auth.uid(), i.organization_id)));

-- INVOICE_COUNTERS — readable to org members; writes only via RPC (already blocked)
DROP POLICY IF EXISTS "Org members view counters" ON public.invoice_counters;
CREATE POLICY "View counters in member org" ON public.invoice_counters FOR SELECT TO authenticated
  USING (public.is_member_of_org(auth.uid(), organization_id));

-- AUDIT_LOG
CREATE POLICY "Members view audit in their org" ON public.audit_log FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (organization_id IS NOT NULL AND public.has_role_or_super(auth.uid(), 'admin', organization_id))
    OR user_id = auth.uid()
  );

-- ========================================
-- 6) Update next_invoice_number → koristi active org
-- ========================================
CREATE OR REPLACE FUNCTION public.next_invoice_number(_org_id uuid, _year integer)
RETURNS TABLE(invoice_number text, invoice_seq integer, invoice_year integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _seq INTEGER; _prefix TEXT; _formatted TEXT;
BEGIN
  IF NOT public.is_member_of_org(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Not authorized for this organization';
  END IF;
  INSERT INTO public.invoice_counters (organization_id, year, last_seq)
  VALUES (_org_id, _year, 1)
  ON CONFLICT (organization_id, year)
  DO UPDATE SET last_seq = public.invoice_counters.last_seq + 1
  RETURNING last_seq INTO _seq;
  SELECT COALESCE(invoice_prefix, '') INTO _prefix FROM public.organizations WHERE id = _org_id;
  _formatted := _prefix || LPAD(_seq::TEXT, 4, '0') || '/' || _year::TEXT;
  RETURN QUERY SELECT _formatted, _seq, _year;
END $$;

-- ========================================
-- 7) Funkcija: prebacivanje aktivne org
-- ========================================
CREATE OR REPLACE FUNCTION public.switch_active_organization(_org_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_member_of_org(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;
  UPDATE public.profiles SET active_organization_id = _org_id WHERE id = auth.uid();
  PERFORM public.log_action('switch_org', 'organization', _org_id, NULL);
END $$;

-- ========================================
-- 8) Update claim_organization (joinuje korisnika kao admin ili accountant)
-- ========================================
CREATE OR REPLACE FUNCTION public.claim_organization(_org_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid(); _has_role BOOLEAN; _admin_count INT;
  _assigned_role public.app_role; _existing_active uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Postavi aktivnu org ako nije postavljena
  SELECT active_organization_id INTO _existing_active FROM public.profiles WHERE id = _uid;
  IF _existing_active IS NULL THEN
    UPDATE public.profiles SET active_organization_id = _org_id, organization_id = COALESCE(organization_id, _org_id) WHERE id = _uid;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND organization_id = _org_id) INTO _has_role;
  IF _has_role THEN
    SELECT role::TEXT INTO _assigned_role FROM public.user_roles WHERE user_id = _uid AND organization_id = _org_id LIMIT 1;
    RETURN _assigned_role::TEXT;
  END IF;

  SELECT COUNT(*) INTO _admin_count FROM public.user_roles WHERE organization_id = _org_id AND role = 'admin';
  IF _admin_count = 0 THEN _assigned_role := 'admin'; ELSE _assigned_role := 'accountant'; END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (_uid, _assigned_role, _org_id)
    ON CONFLICT DO NOTHING;
  PERFORM public.log_action('claim_org', 'organization', _org_id, jsonb_build_object('role', _assigned_role));
  RETURN _assigned_role::TEXT;
END $$;

-- ========================================
-- 9) Bulk import funkcije
-- ========================================

-- Bulk import klijenata (idempotentno po name)
CREATE OR REPLACE FUNCTION public.bulk_import_clients(_org_id uuid, _clients jsonb)
RETURNS TABLE(inserted int, skipped int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ins int := 0; _skip int := 0; r jsonb;
BEGIN
  IF NOT public.has_role_or_super(auth.uid(), 'admin', _org_id) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_clients) LOOP
    IF EXISTS (SELECT 1 FROM public.clients WHERE organization_id = _org_id AND lower(name) = lower(r->>'name')) THEN
      _skip := _skip + 1;
    ELSE
      INSERT INTO public.clients (organization_id, name, address, contact_person, notes, city, country)
      VALUES (_org_id, r->>'name', r->>'address', r->>'contact_person', r->>'notes', r->>'city', COALESCE(r->>'country','Bosna i Hercegovina'));
      _ins := _ins + 1;
    END IF;
  END LOOP;
  PERFORM public.log_action('bulk_import_clients', 'client', NULL, jsonb_build_object('inserted', _ins, 'skipped', _skip));
  RETURN QUERY SELECT _ins, _skip;
END $$;

-- Bulk import faktura (svaki invoice JSON: invoice_number, year, seq, issue_date, due_date, period_text, client_name, items[])
CREATE OR REPLACE FUNCTION public.bulk_import_invoices(_org_id uuid, _invoices jsonb)
RETURNS TABLE(inserted int, skipped int, missing_clients int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ins int := 0; _skip int := 0; _miss int := 0;
        inv jsonb; it jsonb; _client_id uuid; _invoice_id uuid;
        _subtotal numeric; _pos int;
BEGIN
  IF NOT public.has_role_or_super(auth.uid(), 'admin', _org_id) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  FOR inv IN SELECT * FROM jsonb_array_elements(_invoices) LOOP
    IF EXISTS (SELECT 1 FROM public.invoices WHERE organization_id = _org_id AND invoice_number = inv->>'invoice_number') THEN
      _skip := _skip + 1; CONTINUE;
    END IF;
    SELECT id INTO _client_id FROM public.clients
      WHERE organization_id = _org_id AND lower(name) = lower(inv->>'client_name') LIMIT 1;
    IF _client_id IS NULL THEN
      INSERT INTO public.clients (organization_id, name, country) 
      VALUES (_org_id, inv->>'client_name', 'Bosna i Hercegovina') RETURNING id INTO _client_id;
      _miss := _miss + 1;
    END IF;

    _subtotal := 0;
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(inv->'items','[]'::jsonb)) LOOP
      _subtotal := _subtotal + COALESCE((it->>'total')::numeric, 0);
    END LOOP;

    INSERT INTO public.invoices (
      organization_id, client_id, invoice_number, invoice_year, invoice_seq,
      issue_date, delivery_date, due_date, period_text, status, subtotal, total, note, place
    ) VALUES (
      _org_id, _client_id, inv->>'invoice_number',
      (inv->>'invoice_year')::int, (inv->>'invoice_seq')::int,
      COALESCE((inv->>'issue_date')::date, CURRENT_DATE),
      COALESCE((inv->>'delivery_date')::date, COALESCE((inv->>'issue_date')::date, CURRENT_DATE)),
      COALESCE((inv->>'due_date')::date, COALESCE((inv->>'issue_date')::date, CURRENT_DATE) + INTERVAL '15 days'),
      inv->>'period_text',
      COALESCE((inv->>'status')::invoice_status, 'issued'),
      _subtotal, _subtotal, inv->>'note', COALESCE(inv->>'place','Sarajevo')
    ) RETURNING id INTO _invoice_id;

    _pos := 1;
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(inv->'items','[]'::jsonb)) LOOP
      INSERT INTO public.invoice_items (invoice_id, position, description, unit, quantity, unit_price, total)
      VALUES (_invoice_id, _pos, it->>'description', COALESCE(it->>'unit','srv'),
              COALESCE((it->>'quantity')::numeric,1), COALESCE((it->>'unit_price')::numeric,0),
              COALESCE((it->>'total')::numeric,0));
      _pos := _pos + 1;
    END LOOP;

    -- update counter ako je sekvenca veća
    INSERT INTO public.invoice_counters (organization_id, year, last_seq)
    VALUES (_org_id, (inv->>'invoice_year')::int, (inv->>'invoice_seq')::int)
    ON CONFLICT (organization_id, year)
    DO UPDATE SET last_seq = GREATEST(public.invoice_counters.last_seq, EXCLUDED.last_seq);

    _ins := _ins + 1;
  END LOOP;
  PERFORM public.log_action('bulk_import_invoices', 'invoice', NULL, jsonb_build_object('inserted', _ins, 'skipped', _skip, 'auto_clients', _miss));
  RETURN QUERY SELECT _ins, _skip, _miss;
END $$;

-- Bulk wipe org data (samo admin/super)
CREATE OR REPLACE FUNCTION public.wipe_org_data(_org_id uuid, _confirm text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _i int; _c int;
BEGIN
  IF NOT public.has_role_or_super(auth.uid(), 'admin', _org_id) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF _confirm <> 'OBRISI SVE PODATKE' THEN
    RAISE EXCEPTION 'Confirmation phrase mismatch';
  END IF;
  DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE organization_id = _org_id);
  DELETE FROM public.invoices WHERE organization_id = _org_id;
  GET DIAGNOSTICS _i = ROW_COUNT;
  DELETE FROM public.clients WHERE organization_id = _org_id;
  GET DIAGNOSTICS _c = ROW_COUNT;
  DELETE FROM public.invoice_counters WHERE organization_id = _org_id;
  PERFORM public.log_action('wipe_org_data', 'organization', _org_id, jsonb_build_object('invoices', _i, 'clients', _c));
  RETURN jsonb_build_object('invoices_deleted', _i, 'clients_deleted', _c);
END $$;

-- ========================================
-- 10) Indeksi
-- ========================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_number ON public.invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_clients_org_name ON public.clients(organization_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON public.audit_log(organization_id, created_at DESC);
