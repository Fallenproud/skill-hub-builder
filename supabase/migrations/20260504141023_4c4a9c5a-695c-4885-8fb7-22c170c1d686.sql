
-- Chat sessions for the SkillHub Agent Chat sidebar
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read chat_sessions" ON public.chat_sessions FOR SELECT USING (true);
CREATE POLICY "Public write chat_sessions" ON public.chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update chat_sessions" ON public.chat_sessions FOR UPDATE USING (true);
CREATE POLICY "Public delete chat_sessions" ON public.chat_sessions FOR DELETE USING (true);

CREATE POLICY "Public read chat_messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Public write chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update chat_messages" ON public.chat_messages FOR UPDATE USING (true);
CREATE POLICY "Public delete chat_messages" ON public.chat_messages FOR DELETE USING (true);

-- Chrome extension capture: API endpoints
CREATE TABLE public.api_endpoints (
  id bigserial PRIMARY KEY,
  url text NOT NULL,
  host text,
  method text,
  status_code integer,
  resource_type text,
  duration_ms integer,
  tab_url text,
  captured_at timestamptz DEFAULT now(),
  source text DEFAULT 'extension'
);

CREATE INDEX idx_api_endpoints_host ON public.api_endpoints(host);
CREATE INDEX idx_api_endpoints_captured ON public.api_endpoints(captured_at DESC);

ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read api_endpoints" ON public.api_endpoints FOR SELECT USING (true);
CREATE POLICY "Public write api_endpoints" ON public.api_endpoints FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete api_endpoints" ON public.api_endpoints FOR DELETE USING (true);

-- Chrome extension capture: detected API keys (only redacted preview, never full key)
CREATE TABLE public.api_keys_detected (
  id bigserial PRIMARY KEY,
  pattern_name text NOT NULL,
  redacted_preview text NOT NULL,
  source_url text,
  source_header text,
  captured_at timestamptz DEFAULT now()
);

ALTER TABLE public.api_keys_detected ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read api_keys_detected" ON public.api_keys_detected FOR SELECT USING (true);
CREATE POLICY "Public write api_keys_detected" ON public.api_keys_detected FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete api_keys_detected" ON public.api_keys_detected FOR DELETE USING (true);

-- Add streaming output column to execution_log
ALTER TABLE public.execution_log ADD COLUMN IF NOT EXISTS stream_chunks text;

-- Register Chat + Extension built-in pages
INSERT INTO public.hub_pages (id, label, path, icon, description, category, color, enabled, built_in, sort_order)
VALUES
  ('extension', 'Extension', '/extension', '⊕', 'Download & manage the API tracker Chrome extension', 'system', '#f59e0b', true, true, 8)
ON CONFLICT (id) DO NOTHING;
