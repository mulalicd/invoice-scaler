
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'accountant');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled');

-- ============= ORGANIZATIONS =============
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  jib TEXT,
  vat_number TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Bosna i Hercegovina',
  phone TEXT,
  email TEXT,
  bank_name TEXT,
  bank_account TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#1f4e8c',
  invoice_prefix TEXT DEFAULT '',
  default_payment_days INTEGER DEFAULT 15,
  default_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, organization_id)
);

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- helper: get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- ============= CLIENTS =============
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jib TEXT,
  jmbg TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Bosna i Hercegovina',
  email TEXT,
  phone TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_clients_name ON public.clients(name);

-- ============= INVOICES =============
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  invoice_year INTEGER NOT NULL,
  invoice_seq INTEGER NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  place TEXT DEFAULT 'Sarajevo',
  period_text TEXT,
  note TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_in_words TEXT,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, invoice_year, invoice_seq)
);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date DESC);

-- ============= INVOICE ITEMS =============
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'kom',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ============= COUNTERS (per organization, per year) =============
CREATE TABLE public.invoice_counters (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, year)
);

-- next-number RPC: atomically increments and returns formatted number
CREATE OR REPLACE FUNCTION public.next_invoice_number(_org_id UUID, _year INTEGER)
RETURNS TABLE(invoice_number TEXT, invoice_seq INTEGER, invoice_year INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _seq INTEGER;
  _prefix TEXT;
  _formatted TEXT;
BEGIN
  -- ensure user belongs to org
  IF public.get_user_organization(auth.uid()) <> _org_id THEN
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
END;
$$;

-- ============= TRIGGERS: updated_at =============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= AUTO-CREATE PROFILE ON SIGNUP =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= ENABLE RLS =============
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- ============= POLICIES =============
-- Organizations
CREATE POLICY "Users see own organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_organization(auth.uid()));
CREATE POLICY "Admins update own organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users view profiles in same org" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins update org profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- User roles (only admins can manage)
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins see roles in org" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND organization_id = public.get_user_organization(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND organization_id = public.get_user_organization(auth.uid()));

-- Clients (org-scoped)
CREATE POLICY "Org members view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Org members insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Org members update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Org admins delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Invoices (org-scoped)
CREATE POLICY "Org members view invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Org members insert invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Org members update invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));
CREATE POLICY "Org admins delete invoices" ON public.invoices
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Invoice items
CREATE POLICY "Org members view invoice items" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND i.organization_id = public.get_user_organization(auth.uid())));
CREATE POLICY "Org members manage invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND i.organization_id = public.get_user_organization(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id
    AND i.organization_id = public.get_user_organization(auth.uid())));

-- Counters
CREATE POLICY "Org members view counters" ON public.invoice_counters
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization(auth.uid()));

-- ============= SEED ORGANIZATIONS =============
INSERT INTO public.organizations (code, name, full_name, city, country, brand_color, invoice_prefix)
VALUES
  ('IDSS', 'IDSS', 'Internationale Deutsche Schule Sarajevo', 'Sarajevo', 'Bosna i Hercegovina', '#1F4E8C', ''),
  ('IMH',  'IMH',  'The Montessori House',                    'Sarajevo', 'Bosna i Hercegovina', '#6FBE44', '');
