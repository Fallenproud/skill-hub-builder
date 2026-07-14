-- RLS regression test harness.
-- SECURITY DEFINER function owned by postgres so it can SET LOCAL ROLE
-- to authenticated/anon and set the JWT sub claim to simulate real requests.
-- Grants EXECUTE to PUBLIC because the function takes no user input and only
-- runs a fixed suite of read-only assertions; it never mutates data.

CREATE OR REPLACE FUNCTION public.run_rls_regression()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  other_id uuid;
  admin_tables text[] := ARRAY[
    'api_endpoints','api_keys_detected','agent_sessions','execution_log',
    'audit_log','skill_invocations','agent_config','memories','api_endpoint_allowlist'
  ];
  tbl text;
  cnt bigint;
  ok boolean;
  err text;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = 'amarax.tm@gmail.com' LIMIT 1;
  SELECT id INTO other_id FROM auth.users WHERE lower(email) <> 'amarax.tm@gmail.com' ORDER BY created_at LIMIT 1;

  IF admin_id IS NULL THEN
    RETURN QUERY SELECT 'setup: admin user exists'::text, false, 'no user with email amarax.tm@gmail.com'::text;
    RETURN;
  END IF;

  -- 1. Function grants
  RETURN QUERY SELECT 'has_role: authenticated can EXECUTE'::text,
    has_function_privilege('authenticated','public.has_role(uuid,public.app_role)','EXECUTE'),
    NULL::text;
  RETURN QUERY SELECT 'has_role: anon cannot EXECUTE'::text,
    NOT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE'),
    NULL::text;

  -- 2. has_role() callable from authenticated context
  BEGIN
    PERFORM set_config('role','authenticated',true);
    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    SELECT public.has_role(admin_id,'admin'::public.app_role) INTO ok;
    RETURN QUERY SELECT 'has_role(admin,admin)=true'::text, ok, NULL::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'has_role(admin,admin)=true'::text, false, SQLERRM;
  END;
  PERFORM set_config('role','postgres',true);

  IF other_id IS NOT NULL THEN
    BEGIN
      PERFORM set_config('role','authenticated',true);
      PERFORM set_config('request.jwt.claim.sub', other_id::text, true);
      SELECT public.has_role(other_id,'admin'::public.app_role) INTO ok;
      RETURN QUERY SELECT 'has_role(other,admin)=false'::text, NOT ok, NULL::text;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'has_role(other,admin)=false'::text, false, SQLERRM;
    END;
    PERFORM set_config('role','postgres',true);
  END IF;

  -- 3. user_roles RLS
  BEGIN
    PERFORM set_config('role','authenticated',true);
    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    SELECT count(*) INTO cnt FROM public.user_roles WHERE user_id = admin_id;
    RETURN QUERY SELECT 'user_roles: admin reads own row'::text, cnt = 1, format('count=%s', cnt);
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'user_roles: admin reads own row'::text, false, SQLERRM;
  END;
  PERFORM set_config('role','postgres',true);

  BEGIN
    PERFORM set_config('role','anon',true);
    SELECT count(*) INTO cnt FROM public.user_roles;
    RETURN QUERY SELECT 'user_roles: anon blocked'::text, cnt = 0, format('count=%s', cnt);
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN QUERY SELECT 'user_roles: anon blocked'::text, true, 'permission denied (expected)';
  WHEN OTHERS THEN
    RETURN QUERY SELECT 'user_roles: anon blocked'::text, false, SQLERRM;
  END;
  PERFORM set_config('role','postgres',true);

  IF other_id IS NOT NULL THEN
    BEGIN
      PERFORM set_config('role','authenticated',true);
      PERFORM set_config('request.jwt.claim.sub', other_id::text, true);
      SELECT count(*) INTO cnt FROM public.user_roles WHERE user_id = admin_id;
      RETURN QUERY SELECT 'user_roles: non-admin cannot see admin row'::text, cnt = 0, format('count=%s', cnt);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'user_roles: non-admin cannot see admin row'::text, false, SQLERRM;
    END;
    PERFORM set_config('role','postgres',true);
  END IF;

  -- 4. Admin-gated tables
  FOREACH tbl IN ARRAY admin_tables LOOP
    -- anon blocked
    BEGIN
      PERFORM set_config('role','anon',true);
      EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO cnt;
      RETURN QUERY SELECT format('%s: anon blocked', tbl), cnt = 0, format('count=%s', cnt);
    EXCEPTION WHEN insufficient_privilege THEN
      RETURN QUERY SELECT format('%s: anon blocked', tbl), true, 'permission denied (expected)';
    WHEN OTHERS THEN
      RETURN QUERY SELECT format('%s: anon blocked', tbl), false, SQLERRM;
    END;
    PERFORM set_config('role','postgres',true);

    -- non-admin blocked
    IF other_id IS NOT NULL THEN
      BEGIN
        PERFORM set_config('role','authenticated',true);
        PERFORM set_config('request.jwt.claim.sub', other_id::text, true);
        EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO cnt;
        RETURN QUERY SELECT format('%s: non-admin blocked', tbl), cnt = 0, format('count=%s', cnt);
      EXCEPTION WHEN insufficient_privilege THEN
        RETURN QUERY SELECT format('%s: non-admin blocked', tbl), true, 'permission denied (expected)';
      WHEN OTHERS THEN
        RETURN QUERY SELECT format('%s: non-admin blocked', tbl), false, SQLERRM;
      END;
      PERFORM set_config('role','postgres',true);
    END IF;

    -- admin can query (no error)
    BEGIN
      PERFORM set_config('role','authenticated',true);
      PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
      EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO cnt;
      RETURN QUERY SELECT format('%s: admin can query', tbl), true, format('rows=%s', cnt);
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
      RETURN QUERY SELECT format('%s: admin can query', tbl), false, err;
    END;
    PERFORM set_config('role','postgres',true);
  END LOOP;

  RETURN;
END;
$$;

-- Restrict execution: only service_role should run this. sandbox tooling
-- reads results via service-role-backed query endpoints, not from anon/authenticated.
REVOKE ALL ON FUNCTION public.run_rls_regression() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_rls_regression() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_rls_regression() TO service_role;

COMMENT ON FUNCTION public.run_rls_regression() IS
  'RLS regression suite. Runs fixed read-only assertions under simulated authenticated/anon roles. Invoke: SELECT * FROM public.run_rls_regression();';
