
-- 1) Whitelist tabela
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email TEXT PRIMARY KEY,
  is_superadmin BOOLEAN NOT NULL DEFAULT false,
  org_roles JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{org_code:'IDSS', role:'admin'}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmin manage whitelist" ON public.allowed_emails FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- 2) Seed
INSERT INTO public.allowed_emails (email, is_superadmin, org_roles) VALUES
  ('direktor@idss.ba', true, '[{"org_code":"IDSS","role":"admin"},{"org_code":"IMH","role":"admin"}]'::jsonb),
  ('mulalic.davor@outlook.ba', true, '[{"org_code":"IDSS","role":"admin"},{"org_code":"IMH","role":"admin"}]'::jsonb),
  ('financije@idss.ba', false, '[{"org_code":"IDSS","role":"admin"},{"org_code":"IDSS","role":"accountant"},{"org_code":"IMH","role":"admin"},{"org_code":"IMH","role":"accountant"}]'::jsonb),
  ('idsssarajevo@gmail.com', false, '[{"org_code":"IDSS","role":"admin"},{"org_code":"IDSS","role":"accountant"},{"org_code":"IMH","role":"admin"},{"org_code":"IMH","role":"accountant"}]'::jsonb),
  ('mehmed.s@poslovnost.ba', false, '[{"org_code":"IDSS","role":"accountant"},{"org_code":"IMH","role":"accountant"}]'::jsonb)
ON CONFLICT (email) DO UPDATE SET is_superadmin = EXCLUDED.is_superadmin, org_roles = EXCLUDED.org_roles;

-- 3) Pojačan handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email TEXT := lower(NEW.email);
  _allowed public.allowed_emails;
  _r jsonb;
  _org_id UUID;
  _first_org UUID;
BEGIN
  SELECT * INTO _allowed FROM public.allowed_emails WHERE lower(email) = _email;
  IF _allowed.email IS NULL THEN
    RAISE EXCEPTION 'Email % nije ovlašten za pristup ovoj aplikaciji.', NEW.email USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
  ON CONFLICT (id) DO NOTHING;

  IF _allowed.is_superadmin THEN
    INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (NEW.id, 'superadmin', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  FOR _r IN SELECT * FROM jsonb_array_elements(_allowed.org_roles) LOOP
    SELECT id INTO _org_id FROM public.organizations WHERE code = _r->>'org_code';
    IF _org_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role, organization_id)
      VALUES (NEW.id, (_r->>'role')::app_role, _org_id)
      ON CONFLICT DO NOTHING;
      IF _first_org IS NULL THEN _first_org := _org_id; END IF;
    END IF;
  END LOOP;

  IF _first_org IS NOT NULL THEN
    UPDATE public.profiles SET organization_id = _first_org, active_organization_id = _first_org WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Backfill: za već postojeće korisnike koji su u whitelistu - dodaj role
DO $$
DECLARE u RECORD; a public.allowed_emails; r jsonb; oid uuid; first_oid uuid;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    SELECT * INTO a FROM public.allowed_emails WHERE lower(email) = lower(u.email);
    IF a.email IS NULL THEN CONTINUE; END IF;
    IF a.is_superadmin THEN
      INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (u.id, 'superadmin', NULL) ON CONFLICT DO NOTHING;
    END IF;
    first_oid := NULL;
    FOR r IN SELECT * FROM jsonb_array_elements(a.org_roles) LOOP
      SELECT id INTO oid FROM public.organizations WHERE code = r->>'org_code';
      IF oid IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (u.id, (r->>'role')::app_role, oid) ON CONFLICT DO NOTHING;
        IF first_oid IS NULL THEN first_oid := oid; END IF;
      END IF;
    END LOOP;
    IF first_oid IS NOT NULL THEN
      UPDATE public.profiles SET organization_id = COALESCE(organization_id, first_oid), active_organization_id = COALESCE(active_organization_id, first_oid) WHERE id = u.id;
    END IF;
  END LOOP;
END $$;

-- 5) Error log
CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  organization_id UUID,
  message TEXT NOT NULL,
  source TEXT,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own errors" ON public.error_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Admins view errors" ON public.error_log FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (organization_id IS NOT NULL AND public.has_role_or_super(auth.uid(), 'admin', organization_id)));

CREATE OR REPLACE FUNCTION public.log_client_error(_message TEXT, _source TEXT, _stack TEXT, _url TEXT, _user_agent TEXT, _context JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.error_log (user_id, user_email, organization_id, message, source, stack, url, user_agent, context)
  VALUES (auth.uid(), _email, public.get_active_org(auth.uid()),
          LEFT(COALESCE(_message,''), 2000), LEFT(COALESCE(_source,''), 500),
          LEFT(COALESCE(_stack,''), 8000), LEFT(COALESCE(_url,''), 1000),
          LEFT(COALESCE(_user_agent,''), 500), _context);
END $$;
