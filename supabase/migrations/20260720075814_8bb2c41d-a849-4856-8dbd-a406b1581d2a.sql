
CREATE TABLE IF NOT EXISTS public.retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  error_log_days INTEGER NOT NULL DEFAULT 90 CHECK (error_log_days BETWEEN 7 AND 3650),
  audit_log_days INTEGER NOT NULL DEFAULT 2555 CHECK (audit_log_days BETWEEN 30 AND 3650),
  draft_invoice_days INTEGER NOT NULL DEFAULT 365 CHECK (draft_invoice_days BETWEEN 30 AND 3650),
  invoice_retention_years INTEGER NOT NULL DEFAULT 11 CHECK (invoice_retention_years BETWEEN 5 AND 50),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retention_policies TO authenticated;
GRANT ALL ON public.retention_policies TO service_role;

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retention_select_org_members"
ON public.retention_policies FOR SELECT TO authenticated
USING (
  public.has_role_or_super(auth.uid(), 'admin'::app_role, organization_id)
  OR public.has_role_or_super(auth.uid(), 'viewer'::app_role, organization_id)
  OR public.has_role_or_super(auth.uid(), 'accountant'::app_role, organization_id)
);

CREATE POLICY "retention_admin_insert"
ON public.retention_policies FOR INSERT TO authenticated
WITH CHECK (public.has_role_or_super(auth.uid(), 'admin'::app_role, organization_id));

CREATE POLICY "retention_admin_update"
ON public.retention_policies FOR UPDATE TO authenticated
USING (public.has_role_or_super(auth.uid(), 'admin'::app_role, organization_id))
WITH CHECK (public.has_role_or_super(auth.uid(), 'admin'::app_role, organization_id));

CREATE POLICY "retention_super_delete"
ON public.retention_policies FOR DELETE TO authenticated
USING (public.has_role_or_super(auth.uid(), 'superadmin'::app_role, organization_id));

CREATE TRIGGER trg_retention_updated_at
BEFORE UPDATE ON public.retention_policies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.run_retention_cleanup(_org_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.retention_policies%ROWTYPE;
  del_errors INT := 0;
  del_audit  INT := 0;
  del_drafts INT := 0;
BEGIN
  IF NOT public.has_role_or_super(auth.uid(), 'admin'::app_role, _org_id) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  SELECT * INTO cfg FROM public.retention_policies WHERE organization_id = _org_id;
  IF NOT FOUND THEN
    INSERT INTO public.retention_policies(organization_id, updated_by)
    VALUES (_org_id, auth.uid())
    RETURNING * INTO cfg;
  END IF;

  DELETE FROM public.error_log
   WHERE organization_id = _org_id
     AND created_at < now() - (cfg.error_log_days || ' days')::interval;
  GET DIAGNOSTICS del_errors = ROW_COUNT;

  DELETE FROM public.audit_log
   WHERE organization_id = _org_id
     AND created_at < now() - (cfg.audit_log_days || ' days')::interval;
  GET DIAGNOSTICS del_audit = ROW_COUNT;

  DELETE FROM public.invoices
   WHERE organization_id = _org_id
     AND status = 'draft'
     AND created_at < now() - (cfg.draft_invoice_days || ' days')::interval;
  GET DIAGNOSTICS del_drafts = ROW_COUNT;

  INSERT INTO public.audit_log (organization_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (_org_id, auth.uid(), 'retention_cleanup', 'retention_policies', cfg.id,
    jsonb_build_object('errors', del_errors, 'audit', del_audit, 'drafts', del_drafts));

  RETURN jsonb_build_object(
    'error_log_deleted', del_errors,
    'audit_log_deleted', del_audit,
    'draft_invoices_deleted', del_drafts,
    'invoice_retention_years', cfg.invoice_retention_years
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_retention_cleanup(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_retention_cleanup(UUID) TO authenticated;
