# RLS regression tests

Structural assertions covering:

1. `public.has_role()` — grants (`authenticated` EXECUTE, `anon` blocked) and
   semantics (returns true for the admin, false for a non-admin).
2. `public.user_roles` — RLS enabled, no policy exposes rows to `anon`/`public`,
   at least one read policy exists (owner + admin paths).
3. Every admin-gated table (`api_endpoints`, `api_keys_detected`,
   `agent_sessions`, `execution_log`, `audit_log`, `skill_invocations`,
   `agent_config`, `memories`, `api_endpoint_allowlist`) — RLS enabled, no
   policy exposes rows to `anon`/`public`, at least one read policy is gated
   by `has_role(auth.uid(), 'admin')`.

Runs the DB function `public.run_rls_regression()`.

## Run

```bash
bash tests/rls/run.sh
```

Or from any Supabase-connected tool:

```sql
SELECT * FROM public.run_rls_regression() ORDER BY passed, test_name;
```

Regressions surface as `passed = false`. The function is `SECURITY DEFINER`,
takes no user input, and only reads catalog + a fixed set of tables.
