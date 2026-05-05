-- =====================================================
-- Fix : récursion RLS sur la table utilisateurs
-- =====================================================
-- La policy "utilisateurs_admin_tout" (créée dans 20260330000000) fait
--
--   USING (EXISTS (SELECT 1 FROM utilisateurs u
--                  WHERE u.id = auth.uid() AND u.role = 'administrateur'))
--
-- Le sous-SELECT sur utilisateurs déclenche à nouveau les RLS de
-- utilisateurs, qui ré-évalue cette même policy → récursion. Postgres
-- lève alors `42P17 infinite recursion detected in policy for relation
-- "utilisateurs"`. Tant que la fonction is_admin() restait en
-- SECURITY DEFINER (créée hors migrations, via dashboard) et bypassait
-- les RLS, le problème était masqué. La migration 20260420000004 l'a
-- passée en SECURITY INVOKER → la récursion est devenue effective et
-- toutes les requêtes admin (Ateliers, Disponibilités, Membres, etc.)
-- restent bloquées ou échouent silencieusement.
-- =====================================================

-- 1. (Re)créer is_admin() en SECURITY DEFINER avec search_path stable.
--    Idempotent : remplace la version dashboard ou l'absence.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.utilisateurs
    WHERE id = auth.uid()
      AND role = 'administrateur'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS
  'Retourne TRUE si l''utilisateur connecté a le rôle administrateur. SECURITY DEFINER pour bypasser les RLS de utilisateurs et éviter les récursions.';


-- 2. Réécrire la policy récursive sur utilisateurs.
DROP POLICY IF EXISTS "utilisateurs_admin_tout" ON utilisateurs;
CREATE POLICY "utilisateurs_admin_tout"
  ON utilisateurs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 3. Réécrire les autres policies admin qui font le même EXISTS subquery
--    (formateurs, categories, ateliers, inscriptions, avis). Pas
--    indispensable pour la récursion (elles ne sont pas sur utilisateurs)
--    mais ça évite N appels EXISTS coûteux et factorise le check admin.
DROP POLICY IF EXISTS "formateurs_admin" ON formateurs;
CREATE POLICY "formateurs_admin"
  ON formateurs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "categories_admin" ON categories;
CREATE POLICY "categories_admin"
  ON categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ateliers_admin" ON ateliers;
CREATE POLICY "ateliers_admin"
  ON ateliers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "inscriptions_admin" ON inscriptions;
CREATE POLICY "inscriptions_admin"
  ON inscriptions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "avis_admin" ON avis;
CREATE POLICY "avis_admin"
  ON avis FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
