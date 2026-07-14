#!/usr/bin/env bash
# Run the RLS regression suite defined in public.run_rls_regression().
# Requires managed Supabase psql access (PG* env preset).
set -euo pipefail
[ -n "${PGHOST:-}" ] || { echo "PGHOST not set — needs managed Supabase access"; exit 2; }
psql -F $'\t' -A -c "SELECT passed, test_name, COALESCE(detail,'') FROM public.run_rls_regression() ORDER BY passed, test_name;" \
  | awk -F'\t' 'NR==1{next} /^\(/{print;next} {status=($1=="t")?"PASS":"FAIL"; printf "  %s  %s%s\n",status,$2,($3==""?"":"  ["$3"]"); if($1!="t")fail++} END{print ""; print "Result: " (fail?fail" FAILED":"all passed")}'
