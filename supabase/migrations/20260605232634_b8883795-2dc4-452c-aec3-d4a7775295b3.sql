CREATE OR REPLACE FUNCTION public.log_client_error(
  _message text,
  _source text,
  _stack text,
  _url text,
  _user_agent text,
  _context jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := null;
  _org uuid := null;
BEGIN
  IF _uid IS NOT NULL THEN
    SELECT email INTO _email FROM auth.users WHERE id = _uid;
    SELECT public.get_active_org(_uid) INTO _org;
  END IF;

  INSERT INTO public.error_log (
    user_id,
    user_email,
    organization_id,
    message,
    source,
    stack,
    url,
    user_agent,
    context
  ) VALUES (
    _uid,
    _email,
    _org,
    LEFT(COALESCE(_message, ''), 2000),
    LEFT(COALESCE(_source, ''), 500),
    LEFT(COALESCE(_stack, ''), 8000),
    LEFT(COALESCE(_url, ''), 1000),
    LEFT(COALESCE(_user_agent, ''), 500),
    COALESCE(_context, '{}'::jsonb)
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text, jsonb) TO anon, authenticated;