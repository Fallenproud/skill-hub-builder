
-- 1. Insert meta skill: Skill-Registry-Manifest
INSERT INTO public.skills (id, category_id, name, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, inputs, outputs)
VALUES (
  'sys-006',
  'sys',
  'Skill-Registry-Manifest',
  'Returns the complete categorized catalog of available SkillHub skills as a structured manifest for external agents (e.g. Sophie).',
  'When an external agent asks "what skills are available?" or requests a capability index/manifest/catalog.',
  'Read-only — returns only registry metadata, never invokes downstream skills.',
  1,
  'low',
  'fast',
  true,
  '[]'::jsonb,
  '{"type":"object","properties":{"version":{"type":"string"},"total":{"type":"integer"},"categories":{"type":"array"}}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_condition = EXCLUDED.trigger_condition,
  boundary = EXCLUDED.boundary,
  outputs = EXCLUDED.outputs,
  updated_at = now();

-- 2. Patch handle_new_user trigger to auto-promote amarax.tm@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));

  IF lower(NEW.email) = 'amarax.tm@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: grant admin to amarax.tm@gmail.com if already signed up
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = 'amarax.tm@gmail.com' LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
