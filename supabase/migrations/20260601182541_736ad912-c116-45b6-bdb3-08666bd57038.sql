CREATE TABLE IF NOT EXISTS public.skill_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  skill text NOT NULL,
  input jsonb,
  status text NOT NULL DEFAULT 'queued',
  output jsonb,
  error text,
  duration_ms integer,
  callback_url text,
  callback_attempts integer NOT NULL DEFAULT 0,
  callback_last_status integer,
  callback_last_response text,
  callback_last_at timestamptz,
  callback_delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS skill_invocations_created_at_idx ON public.skill_invocations(created_at DESC);
CREATE INDEX IF NOT EXISTS skill_invocations_skill_idx ON public.skill_invocations(skill);

GRANT SELECT ON public.skill_invocations TO authenticated;
GRANT ALL ON public.skill_invocations TO service_role;

ALTER TABLE public.skill_invocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read skill_invocations"
  ON public.skill_invocations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));