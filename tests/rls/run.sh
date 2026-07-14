#!/usr/bin/env bash
# RLS regression tests for user_roles + admin-gated tables.
# Requires managed Supabase PG* env. Reads IDs from public.profiles (auth schema is restricted).
set -euo pipefail

ADMIN_EMAIL="${ADMIN_EMAIL:-amarax.tm@gmail.com}"
ADMIN_ID="$(psql -tAc "SELECT id FROM public.profiles WHERE lower(email)='$ADMIN_EMAIL'")"
[ -n "$ADMIN_ID" ] || { echo "FAIL: admin profile not found for $ADMIN_EMAIL"; exit 1; }
OTHER_ID="$(psql -tAc "SELECT id FROM public.profiles WHERE lower(email) <> '$ADMIN_EMAIL' ORDER BY created_at LIMIT 1")"

pass=0; fail=0
check() {
  local name="$1" sql="$2" expected="$3"
  local got; got="$(psql -tAc "$sql" 2>&1 | tr -d '[:space:]')" || true
  if [ "$got" = "$expected" ]; then echo "  PASS $name"; pass=$((pass+1))
  else echo "  FAIL $name — expected=$expected got=$got"; fail=$((fail+1)); fi
}

as_admin()   { echo "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$ADMIN_ID';"; }
as_other()   { echo "SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub TO '$OTHER_ID';"; }
as_anon()    { echo "SET LOCAL ROLE anon;"; }

echo "== 1. Function grants =="
check "authenticated has EXECUTE on has_role" \
  "SELECT has_function_privilege('authenticated','public.has_role(uuid,public.app_role)','EXECUTE')" "t"
check "anon does NOT have EXECUTE on has_role" \
  "SELECT has_function_privilege('anon','public.has_role(uuid,public.app_role)','EXECUTE')" "f"

echo "== 2. has_role() callable from authenticated context =="
check "has_role(admin,'admin')=true" \
  "$(as_admin) SELECT public.has_role('$ADMIN_ID'::uuid,'admin'::public.app_role)" "t"
if [ -n "$OTHER_ID" ]; then
  check "has_role(other,'admin')=false" \
    "$(as_other) SELECT public.has_role('$OTHER_ID'::uuid,'admin'::public.app_role)" "f"
fi

echo "== 3. user_roles RLS =="
check "admin sees own user_roles row" \
  "$(as_admin) SELECT count(*) FROM public.user_roles WHERE user_id='$ADMIN_ID'" "1"
check "anon cannot read user_roles" \
  "$(as_anon) SELECT count(*) FROM public.user_roles" "0"
if [ -n "$OTHER_ID" ]; then
  check "non-admin cannot see admin's user_roles" \
    "$(as_other) SELECT count(*) FROM public.user_roles WHERE user_id='$ADMIN_ID'" "0"
fi

echo "== 4. Admin-gated tables =="
for t in api_endpoints api_keys_detected agent_sessions execution_log audit_log skill_invocations agent_config memories api_endpoint_allowlist; do
  check "anon blocked from $t" "$(as_anon) SELECT count(*) FROM public.$t" "0"
  if [ -n "$OTHER_ID" ]; then
    check "non-admin blocked from $t" "$(as_other) SELECT count(*) FROM public.$t" "0"
  fi
  check "admin can query $t" "$(as_admin) SELECT (count(*) >= 0)::text FROM public.$t" "true"
done

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
