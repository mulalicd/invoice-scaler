
-- 1) Idempotency: unique invoice number per organization
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.invoices'::regclass AND conname='invoices_org_number_key'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_org_number_key UNIQUE (organization_id, invoice_number);
  END IF;
END $$;

-- 2) Lock down SECURITY DEFINER functions: revoke from public/anon, grant to authenticated only
REVOKE ALL ON FUNCTION public.log_client_error(text,text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bulk_import_invoices(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bulk_import_clients(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wipe_org_data(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_organization(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.switch_active_organization(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.next_invoice_number(uuid,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_organizations_for_onboarding() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_action(text,text,uuid,jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.log_client_error(text,text,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_invoices(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_clients(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wipe_org_data(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_active_organization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organizations_for_onboarding() TO authenticated;

-- 3) log_client_error now requires authenticated user
CREATE OR REPLACE FUNCTION public.log_client_error(_message text, _source text, _stack text, _url text, _user_agent text, _context jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.error_log (user_id, user_email, organization_id, message, source, stack, url, user_agent, context)
  VALUES (auth.uid(), _email, public.get_active_org(auth.uid()),
          LEFT(COALESCE(_message,''), 2000), LEFT(COALESCE(_source,''), 500),
          LEFT(COALESCE(_stack,''), 8000), LEFT(COALESCE(_url,''), 1000),
          LEFT(COALESCE(_user_agent,''), 500), _context);
END $function$;

-- 4) New detailed import returning per-invoice errors
CREATE OR REPLACE FUNCTION public.bulk_import_invoices_detailed(_org_id uuid, _invoices jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ins int := 0; _skip int := 0; _miss int := 0; _err int := 0;
  inv jsonb; it jsonb; _client_id uuid; _invoice_id uuid;
  _subtotal numeric; _pos int;
  _errors jsonb := '[]'::jsonb;
  _skipped jsonb := '[]'::jsonb;
  _number text; _year int; _seq int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.has_role_or_super(auth.uid(), 'admin', _org_id) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  FOR inv IN SELECT * FROM jsonb_array_elements(_invoices) LOOP
    BEGIN
      _number := COALESCE(NULLIF(inv->>'invoice_number',''), NULL);
      IF _number IS NULL THEN
        _err := _err + 1;
        _errors := _errors || jsonb_build_object('row', inv->>'_row', 'invoice_number', NULL, 'reason', 'Nedostaje invoice_number');
        CONTINUE;
      END IF;

      IF EXISTS (SELECT 1 FROM public.invoices WHERE organization_id = _org_id AND invoice_number = _number) THEN
        _skip := _skip + 1;
        _skipped := _skipped || jsonb_build_object('row', inv->>'_row', 'invoice_number', _number, 'reason', 'Već postoji (idempotentno preskočeno)');
        CONTINUE;
      END IF;

      _year := COALESCE((inv->>'invoice_year')::int, EXTRACT(YEAR FROM COALESCE((inv->>'issue_date')::date, CURRENT_DATE))::int);
      _seq  := COALESCE((inv->>'invoice_seq')::int, 0);

      IF EXISTS (SELECT 1 FROM public.invoices WHERE organization_id = _org_id AND invoice_year = _year AND invoice_seq = _seq AND _seq > 0) THEN
        _skip := _skip + 1;
        _skipped := _skipped || jsonb_build_object('row', inv->>'_row', 'invoice_number', _number, 'reason', format('Sekvenca %s/%s već postoji', _seq, _year));
        CONTINUE;
      END IF;

      SELECT id INTO _client_id FROM public.clients
        WHERE organization_id = _org_id AND lower(name) = lower(inv->>'client_name') LIMIT 1;
      IF _client_id IS NULL THEN
        INSERT INTO public.clients (organization_id, name, country, contact_person, address, notes)
        VALUES (_org_id, inv->>'client_name', 'Bosna i Hercegovina',
                inv->>'contact_person', inv->>'address', inv->>'child_name')
        RETURNING id INTO _client_id;
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
        _org_id, _client_id, _number, _year, _seq,
        COALESCE((inv->>'issue_date')::date, CURRENT_DATE),
        COALESCE((inv->>'delivery_date')::date, COALESCE((inv->>'issue_date')::date, CURRENT_DATE)),
        COALESCE((inv->>'due_date')::date, COALESCE((inv->>'issue_date')::date, CURRENT_DATE) + INTERVAL '15 days'),
        inv->>'period_text',
        COALESCE(NULLIF(inv->>'status','')::invoice_status, 'issued'),
        _subtotal, _subtotal, inv->>'note', COALESCE(NULLIF(inv->>'place',''),'Sarajevo')
      ) RETURNING id INTO _invoice_id;

      _pos := 1;
      FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(inv->'items','[]'::jsonb)) LOOP
        INSERT INTO public.invoice_items (invoice_id, position, description, unit, quantity, unit_price, total)
        VALUES (_invoice_id, _pos, it->>'description', COALESCE(NULLIF(it->>'unit',''),'srv'),
                COALESCE((it->>'quantity')::numeric,1), COALESCE((it->>'unit_price')::numeric,0),
                COALESCE((it->>'total')::numeric,0));
        _pos := _pos + 1;
      END LOOP;

      IF _seq > 0 THEN
        INSERT INTO public.invoice_counters (organization_id, year, last_seq)
        VALUES (_org_id, _year, _seq)
        ON CONFLICT (organization_id, year)
        DO UPDATE SET last_seq = GREATEST(public.invoice_counters.last_seq, EXCLUDED.last_seq);
      END IF;

      _ins := _ins + 1;
    EXCEPTION WHEN OTHERS THEN
      _err := _err + 1;
      _errors := _errors || jsonb_build_object('row', inv->>'_row', 'invoice_number', inv->>'invoice_number', 'reason', SQLERRM);
    END;
  END LOOP;

  PERFORM public.log_action('bulk_import_invoices_detailed', 'invoice', NULL,
    jsonb_build_object('inserted', _ins, 'skipped', _skip, 'errors', _err, 'auto_clients', _miss));

  RETURN jsonb_build_object(
    'inserted', _ins, 'skipped', _skip, 'errors', _err, 'missing_clients', _miss,
    'error_details', _errors, 'skipped_details', _skipped
  );
END $function$;

REVOKE ALL ON FUNCTION public.bulk_import_invoices_detailed(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_import_invoices_detailed(uuid,jsonb) TO authenticated;
