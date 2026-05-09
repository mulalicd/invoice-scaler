-- 1) Revoke EXECUTE on all SECURITY DEFINER functions in public from anon/public/authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 2) Grant EXECUTE back to authenticated only for client-callable RPCs
GRANT EXECUTE ON FUNCTION public.switch_active_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organizations_for_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_clients(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_invoices(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_invoices_detailed(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipe_org_data(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_organization(uuid) TO authenticated;

-- 3) Performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_issue_date ON public.invoices(organization_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON public.invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_client ON public.invoices(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number_trgm ON public.invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_name ON public.clients(organization_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_audit_org_created ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_org_created ON public.error_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);