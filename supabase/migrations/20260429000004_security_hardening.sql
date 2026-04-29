-- =====================================================
-- Security Advisor : durcissement sans casser les accès
-- =====================================================
-- Adresse les warnings :
--   1. public_bucket_allows_listing (images)
--      → on supprime la policy SELECT publique. Le bucket est public ;
--        les URLs servies par /storage/v1/object/public/images/...
--        fonctionnent sans policy (la RLS n'est pas évaluée pour ce
--        endpoint). Supprimer la SELECT empêche juste le LIST API.
--
--   2 & 3. *_security_definer_function_executable (is_admin)
--      → on déplace public.is_admin() dans le schéma `private` qui
--        n'est PAS exposé par PostgREST (db-schemas = public). La
--        fonction reste appelable depuis les policies RLS via le nom
--        qualifié private.is_admin(), mais plus via /rest/v1/rpc/is_admin.
--        Toutes les policies admin sont recréées en conséquence.
--
--   4. anon/authenticated_security_definer_function_executable
--      (link_utilisateur_to_auth)
--      → on révoque EXECUTE à anon/authenticated/PUBLIC. La fonction
--        n'est utilisée que par le trigger AFTER INSERT ON auth.users :
--        un trigger n'a pas besoin que le rôle appelant ait EXECUTE.
--
--   5. auth_leaked_password_protection
--      → NON corrigeable en SQL. À activer dans :
--        Dashboard Supabase → Authentication → Policies →
--        "Leaked password protection" (toggle on).
-- =====================================================


-- 1. Bucket images : supprimer la policy SELECT publique
-- ----------------------------------------------------
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;


-- 2. Schéma `private` pour les helpers SECURITY DEFINER
-- ----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT  USAGE ON SCHEMA private TO authenticated;


-- 3. is_admin() recréé dans private
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_admin()
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

REVOKE EXECUTE ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.is_admin() TO authenticated;

COMMENT ON FUNCTION private.is_admin() IS
  'Helper pour les policies RLS. Schéma privé : non exposé par PostgREST. SECURITY DEFINER pour bypasser la RLS de utilisateurs et éviter la récursion.';


-- 4. Recréer toutes les policies qui appelaient public.is_admin()
-- ----------------------------------------------------
DROP POLICY IF EXISTS "utilisateurs_admin_tout" ON utilisateurs;
CREATE POLICY "utilisateurs_admin_tout"
  ON utilisateurs FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "formateurs_admin" ON formateurs;
CREATE POLICY "formateurs_admin"
  ON formateurs FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "categories_admin" ON categories;
CREATE POLICY "categories_admin"
  ON categories FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "ateliers_admin" ON ateliers;
CREATE POLICY "ateliers_admin"
  ON ateliers FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "inscriptions_admin" ON inscriptions;
CREATE POLICY "inscriptions_admin"
  ON inscriptions FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "avis_admin" ON avis;
CREATE POLICY "avis_admin"
  ON avis FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "images_admin_write" ON storage.objects;
CREATE POLICY "images_admin_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'images' AND private.is_admin())
  WITH CHECK (bucket_id = 'images' AND private.is_admin());


-- 5. Supprimer public.is_admin() pour fermer l'endpoint RPC
-- ----------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin();


-- 6. link_utilisateur_to_auth : révoquer EXECUTE à tous les rôles client
-- ----------------------------------------------------
-- Le trigger AFTER INSERT ON auth.users continue de fonctionner sans
-- EXECUTE (Postgres déclenche le trigger indépendamment des privilèges
-- du rôle appelant).
REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM authenticated;
