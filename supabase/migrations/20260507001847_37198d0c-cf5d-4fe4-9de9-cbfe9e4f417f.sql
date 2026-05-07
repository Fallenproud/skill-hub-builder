
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bootstrap: first signed-in user can claim admin if no admin exists
CREATE OR REPLACE FUNCTION public.claim_admin_if_unclaimed()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

-- Lock down sensitive tables: drop public policies, add admin-only

-- audit_log
DROP POLICY IF EXISTS "Public read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Public write audit_log" ON public.audit_log;
CREATE POLICY "Admins read audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- agent_config
DROP POLICY IF EXISTS "Public read config" ON public.agent_config;
DROP POLICY IF EXISTS "Public write config" ON public.agent_config;
DROP POLICY IF EXISTS "Public update config" ON public.agent_config;
DROP POLICY IF EXISTS "Public delete config" ON public.agent_config;
CREATE POLICY "Admins manage agent_config" ON public.agent_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- api_keys_detected
DROP POLICY IF EXISTS "Public read api_keys_detected" ON public.api_keys_detected;
DROP POLICY IF EXISTS "Public write api_keys_detected" ON public.api_keys_detected;
DROP POLICY IF EXISTS "Public delete api_keys_detected" ON public.api_keys_detected;
CREATE POLICY "Admins read api_keys_detected" ON public.api_keys_detected FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete api_keys_detected" ON public.api_keys_detected FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Inserts to api_keys_detected only via service role (extension sync route)

-- memories
DROP POLICY IF EXISTS "Public read memories" ON public.memories;
DROP POLICY IF EXISTS "Public write memories" ON public.memories;
DROP POLICY IF EXISTS "Public update memories" ON public.memories;
DROP POLICY IF EXISTS "Public delete memories" ON public.memories;
CREATE POLICY "Admins manage memories" ON public.memories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- api_endpoints: lock reads/deletes to admin; inserts via server route only
DROP POLICY IF EXISTS "Public read api_endpoints" ON public.api_endpoints;
DROP POLICY IF EXISTS "Public write api_endpoints" ON public.api_endpoints;
DROP POLICY IF EXISTS "Public delete api_endpoints" ON public.api_endpoints;
CREATE POLICY "Admins read api_endpoints" ON public.api_endpoints FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete api_endpoints" ON public.api_endpoints FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
