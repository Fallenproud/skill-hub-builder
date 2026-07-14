#!/usr/bin/env bash
# RLS regression tests. Requires PG* env (managed Supabase access).
# Verifies:
#   1. authenticated has EXECUTE on public.has_role; anon does not.
#   2. has_role() works from the authenticated role context (no permission-denied).
#   3. user_roles is readable by the owning user; not readable across users; anon blocked.
#   4. Admin-gated tables (api_endpoints, api_keys_detected, agent_sessions,
#      execution_log, audit_log, skill_invocations) are visible only to admins.
set -euo pipefail

ADMIN_ID="$(psql -tAc "SELECT id FROM auth.users WHERE lower(email)='amarax.tm@gmail.com'")"
if [ -z "$ADMIN_ID" ]; then echo "FAIL: admin user not found"; exit 1; fi

# A non-admin user (pick any other auth user; skip test if none exists).
OTHER_ID="$(psql -tAc "SELECT id FROM auth.users WHERE lower(email) <> 'amarax.tm@gmail.com' ORDER BY created_at LIMIT 1")"

pass=0; fail=0
check() { # name, sql, expected
  local name="$1" sql="$2" expected="$3"
  local got; got="$(psql -tAc "$sql" | tr -d '[:space:]')"
  if [ "$got" = "$expected" ]; then echo "  PASS $name"; pass=$((pass+1))
  else echo "  FAIL $name — expected=$expected got=$got"; fail=$((fail+1)); fi
}

echo "== 1. Function grants =="
check "authenticated has EXECUTE on has_role" \
  "SELECT has_function_privilege('authenticated','public.has_role(uuid,public.app_role)','EXECUTE')" "t"
check "anon does NOT have EXECUTE on has_role" \
  "SELECT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE')" "f"

echo "== 2. has_role() callable from authenticated context =="
check "has_role returns true for admin" \
  "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$ADMIN_ID'; SELECT public.has_role('$ADMIN_ID','admin')" "t"

echo "== 3. user_roles RLS =="
check "admin can read own user_roles row" \
  "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$ADMIN_ID'; SELECT count(*) FROM public.user_roles WHERE user_id='$ADMIN_ID'" "1"
check "anon cannot read user_roles" \
  "SET LOCAL ROLE anon; SELECT count(*) FROM public.user_roles" "0"
if [ -n "$OTHER_ID" ]; then
  check "non-admin cannot see admin's user_roles row" \
    "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$OTHER_ID'; SELECT count(*) FROM public.user_roles WHERE user_id='$ADMIN_ID'" "0"
fi

echo "== 4. Admin-gated tables =="
for t in api_endpoints api_keys_detected agent_sessions execution_log audit_log skill_invocations agent_config memories api_endpoint_allowlist; do
  check "anon blocked from $t" \
    "SET LOCAL ROLE anon; SELECT count(*) FROM public.$t" "0"
  if [ -n "$OTHER_ID" ]; then
    check "non-admin blocked from $t" \
      "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$OTHER_ID'; SELECT count(*) FROM public.$t" "0"
  fi
  # admin visibility: only asserts the query doesn't error. Row count depends on data.
  check "admin can query $t (no error)" \
    "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$ADMIN_ID'; SELECT (count(*) >= 0)::text FROM public.$t" "true"
done

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
