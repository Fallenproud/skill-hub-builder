
CREATE TABLE public.api_endpoint_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL UNIQUE,
  note text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_endpoint_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage allowlist"
  ON public.api_endpoint_allowlist
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_api_endpoint_allowlist_updated_at
  BEFORE UPDATE ON public.api_endpoint_allowlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_allowlist_enabled ON public.api_endpoint_allowlist(enabled) WHERE enabled = true;
