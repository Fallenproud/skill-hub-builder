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

  -- 2. has_role() semantics
  SELECT public.has_role(admin_id,'admin'::public.app_role) INTO b;
  RETURN QUERY SELECT 'has_role: admin=admin returns true'::text, b, NULL::text;
  IF other_id IS NOT NULL THEN
    SELECT public.has_role(other_id,'admin'::public.app_role) INTO b;
    RETURN QUERY SELECT 'has_role: non-admin=admin returns false'::text, NOT b, NULL::text;
  END IF;

  -- 3. user_roles
  SELECT relrowsecurity INTO b FROM pg_class WHERE oid='public.user_roles'::regclass;
  RETURN QUERY SELECT 'user_roles: RLS enabled'::text, b, NULL::text;

  SELECT count(*) INTO n FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles'
      AND cmd IN ('SELECT','ALL')
      AND ('anon' = ANY(roles) OR 'public' = ANY(roles));
  RETURN QUERY SELECT 'user_roles: no SELECT policy grants anon/public'::text, n = 0, format('anon-facing SELECT policies=%s', n);

  SELECT count(*) INTO n FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND cmd IN ('SELECT','ALL');
  RETURN QUERY SELECT 'user_roles: at least one read policy exists'::text, n >= 1, format('policies=%s', n);

  -- 4. Admin-gated tables
  FOREACH tbl IN ARRAY admin_tables LOOP
    EXECUTE format('SELECT relrowsecurity FROM pg_class WHERE oid=%L::regclass', 'public.'||tbl) INTO b;
    RETURN QUERY SELECT format('%s: RLS enabled', tbl), COALESCE(b,false), NULL::text;

    -- No policy exposes rows to anon or public role
    SELECT count(*) INTO n FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl
        AND cmd IN ('SELECT','ALL')
        AND ('anon' = ANY(roles) OR 'public' = ANY(roles));
    RETURN QUERY SELECT format('%s: no policy exposes rows to anon/public', tbl), n = 0, format('exposing_policies=%s', n);

    -- At least one admin-gated read policy references has_role(...,'admin')
    SELECT count(*) INTO n FROM pg_policies
      WHERE schemaname='public' AND tablename=tbl
        AND cmd IN ('SELECT','ALL')
        AND qual ILIKE '%has_role%'
        AND qual ILIKE '%admin%';
    RETURN QUERY SELECT format('%s: read gated by has_role(_, admin)', tbl), n >= 1, format('matching_policies=%s', n);
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_rls_regression() TO PUBLIC;
