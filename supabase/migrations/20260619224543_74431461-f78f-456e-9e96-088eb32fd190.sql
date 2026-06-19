
-- Lock down sensitive operator tables to admin-only; remove always-true public write policies

-- agent_sessions
DROP POLICY IF EXISTS "Public read sessions" ON public.agent_sessions;
DROP POLICY IF EXISTS "Public write sessions" ON public.agent_sessions;
DROP POLICY IF EXISTS "Public update sessions" ON public.agent_sessions;
DROP POLICY IF EXISTS "Public delete sessions" ON public.agent_sessions;
CREATE POLICY "Admins manage agent_sessions" ON public.agent_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- execution_log
DROP POLICY IF EXISTS "Public read execution_log" ON public.execution_log;
DROP POLICY IF EXISTS "Public write execution_log" ON public.execution_log;
DROP POLICY IF EXISTS "Public update execution_log" ON public.execution_log;
DROP POLICY IF EXISTS "Public delete execution_log" ON public.execution_log;
CREATE POLICY "Admins manage execution_log" ON public.execution_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- chat_sessions
DROP POLICY IF EXISTS "Public read chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public write chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public update chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Public delete chat_sessions" ON public.chat_sessions;
CREATE POLICY "Admins manage chat_sessions" ON public.chat_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- chat_messages
DROP POLICY IF EXISTS "Public read chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public write chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public update chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public delete chat_messages" ON public.chat_messages;
CREATE POLICY "Admins manage chat_messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- skill_invocations: add explicit admin write policies (service-role writes already bypass RLS)
CREATE POLICY "Admins write skill_invocations" ON public.skill_invocations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update skill_invocations" ON public.skill_invocations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete skill_invocations" ON public.skill_invocations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated.
-- has_role is invoked from within RLS policies (definer context), so policy evaluation still works.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- claim_admin_if_unclaimed must remain callable by signed-in users (bootstrap flow)
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() TO authenticated;
