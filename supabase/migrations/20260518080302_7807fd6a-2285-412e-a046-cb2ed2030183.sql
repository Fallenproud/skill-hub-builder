
-- skills: admin-only writes, public read
DROP POLICY IF EXISTS "Public delete skills" ON public.skills;
DROP POLICY IF EXISTS "Public update skills" ON public.skills;
DROP POLICY IF EXISTS "Public write skills" ON public.skills;

CREATE POLICY "Admins write skills" ON public.skills
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update skills" ON public.skills
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete skills" ON public.skills
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- categories: admin-only writes, public read
DROP POLICY IF EXISTS "Public delete categories" ON public.categories;
DROP POLICY IF EXISTS "Public update categories" ON public.categories;
DROP POLICY IF EXISTS "Public write categories" ON public.categories;

CREATE POLICY "Admins write categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update categories" ON public.categories
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete categories" ON public.categories
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- hub_pages: admin-only writes, public read
DROP POLICY IF EXISTS "Public delete hub_pages" ON public.hub_pages;
DROP POLICY IF EXISTS "Public update hub_pages" ON public.hub_pages;
DROP POLICY IF EXISTS "Public write hub_pages" ON public.hub_pages;

CREATE POLICY "Admins write hub_pages" ON public.hub_pages
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update hub_pages" ON public.hub_pages
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete hub_pages" ON public.hub_pages
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
