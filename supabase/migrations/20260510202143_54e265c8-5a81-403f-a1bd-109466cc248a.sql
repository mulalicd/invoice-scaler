-- 1) Add new 'viewer' role (User = read-only)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- 2) Restore the auth signup trigger (currently missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Tighten write policies: only admin/superadmin may insert/update/delete business data
-- CLIENTS
DROP POLICY IF EXISTS "Insert clients in active org" ON public.clients;
DROP POLICY IF EXISTS "Update clients in member org" ON public.clients;
CREATE POLICY "Admin insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_active_org(auth.uid())
              AND has_role_or_super(auth.uid(), 'admin'::app_role, organization_id));
CREATE POLICY "Admin update clients" ON public.clients FOR UPDATE TO authenticated
  USING (has_role_or_super(auth.uid(), 'admin'::app_role, organization_id));

-- INVOICES
DROP POLICY IF EXISTS "Insert invoices in active org" ON public.invoices;
DROP POLICY IF EXISTS "Update invoices in member org" ON public.invoices;
CREATE POLICY "Admin insert invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_active_org(auth.uid())
              AND has_role_or_super(auth.uid(), 'admin'::app_role, organization_id));
CREATE POLICY "Admin update invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (has_role_or_super(auth.uid(), 'admin'::app_role, organization_id));

-- INVOICE ITEMS — split FOR ALL into per-action policies
DROP POLICY IF EXISTS "Manage invoice items in member org" ON public.invoice_items;
CREATE POLICY "View invoice items" ON public.invoice_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_items.invoice_id
                   AND is_member_of_org(auth.uid(), i.organization_id)));
CREATE POLICY "Admin insert invoice items" ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i
                      WHERE i.id = invoice_items.invoice_id
                        AND has_role_or_super(auth.uid(), 'admin'::app_role, i.organization_id)));
CREATE POLICY "Admin update invoice items" ON public.invoice_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_items.invoice_id
                   AND has_role_or_super(auth.uid(), 'admin'::app_role, i.organization_id)));
CREATE POLICY "Admin delete invoice items" ON public.invoice_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_items.invoice_id
                   AND has_role_or_super(auth.uid(), 'admin'::app_role, i.organization_id)));