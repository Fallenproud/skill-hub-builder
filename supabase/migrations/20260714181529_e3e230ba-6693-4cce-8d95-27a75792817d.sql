CREATE OR REPLACE FUNCTION public.run_rls_regression()
RETURNS TABLE(test_name text, passed boolean, detail text)
LANGUAGE plpgsql
STABLE
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
  b boolean;
  n int;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE lower(email)='amarax.tm@gmail.com' LIMIT 1;
  SELECT id INTO other_id FROM auth.users WHERE lower(email)<>'amarax.tm@gmail.com' ORDER BY created_at LIMIT 1;

  IF admin_id IS NULL THEN
    RETURN QUERY SELECT 'setup: admin user exists'::text, false, 'no user amarax.tm@gmail.com'::text; RETURN;
  END IF;

  -- 1. has_role() grants
  RETURN QUERY SELECT 'grant: authenticated EXECUTE has_role'::text,
    has_function_privilege('authenticated','public.has_role(uuid,public.app_role)','EXECUTE'), NULL::text;
  RETURN QUERY SELECT 'grant: anon cannot EXECUTE has_role'::text,
    NOT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE'), NULL::text;

  -- 2. has_role() semantics (SECURITY DEFINER function bypasses RLS on user_roles)
  SELECT public.has_role(admin_id,'admin'::public.app_role) INTO b;
  RETURN QUERY SELECT 'has_role: admin=admin returns true'::text, b, NULL::text;
  IF other_id IS NOT NULL THEN
    SELECT public.has_role(other_id,'admin'::public.app_role) INTO b;
    RETURN QUERY SELECT 'has_role: non-admin=admin returns false'::text, NOT b, NULL::text;
  END IF;

  -- 3. user_roles: RLS enabled + policy shape
  SELECT relrowsecurity INTO b FROM pg_class WHERE oid='public.user_roles'::regclass;
  RETURN QUERY SELECT 'user_roles: RLS enabled'::text, b, NULL::text;
  RETURN QUERY SELECT 'user_roles: authenticated has SELECT grant'::text,
    has_table_privilege('authenticated','public.user_roles','SELECT'), NULL::text;
  RETURN QUERY SELECT 'user_roles: anon has NO SELECT grant'::text,
    NOT has_table_privilege('anon','public.user_roles','SELECT'), NULL::text;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND cmd='SELECT';
  RETURN QUERY SELECT 'user_roles: has at least one SELECT policy'::text, n >= 1, format('policies=%s', n);

  -- 4. Admin-gated tables: anon has NO grants, RLS on, admin-only SELECT policy exists
  FOREACH tbl IN ARRAY admin_tables LOOP
    -- RLS enabled
    EXECUTE format('SELECT relrowsecurity FROM pg_class WHERE oid=%L::regclass', 'public.'||tbl) INTO b;
    RETURN QUERY SELECT format('%s: RLS enabled', tbl), COALESCE(b,false), NULL::text;

    -- anon has no privileges of any kind
    RETURN QUERY SELECT format('%s: anon has NO SELECT grant', tbl), NOT has_table_privilege('anon','public.'||tbl,'SELECT'), NULL::text;
    RETURN QUERY SELECT format('%s: anon has NO INSERT grant', tbl), NOT has_table_privilege('anon','public.'||tbl,'INSERT'), NULL::text;
    RETURN QUERY SELECT format('%s: anon has NO UPDATE grant', tbl), NOT has_table_privilege('anon','public.'||tbl,'UPDATE'), NULL::text;
    RETURN QUERY SELECT format('%s: anon has NO DELETE grant', tbl), NOT has_table_privilege('anon','public.'||tbl,'DELETE'), NULL::text;

    -- At least one SELECT policy that references has_role(...,'admin')
    SELECT count(*) INTO n FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl AND cmd='SELECT'
        AND qual ILIKE '%has_role%admin%';
    RETURN QUERY SELECT format('%s: admin-only SELECT policy present', tbl), n >= 1, format('matching_policies=%s', n);
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_rls_regression() TO PUBLIC;
