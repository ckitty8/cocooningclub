-- =====================================================
-- Correction des warnings du Supabase Database Linter
-- =====================================================
-- 1. function_search_path_mutable : admin_dispo_le
-- 2. rls_policy_always_true       : contact_messages_insert_public
-- 3. rls_policy_always_true       : visites_insert_public
-- 4. public_bucket_allows_listing : avatars_public_read
-- 5. *_security_definer_function_executable : is_admin / decrement_atelier_spots / depublier_ateliers_passes
-- (auth_leaked_password_protection : à activer dans le dashboard, pas de SQL)
-- =====================================================


-- ─────────────────────────────────────────────
-- 1. admin_dispo_le : search_path immutable
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_dispo_le(p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_jour_semaine SMALLINT;
BEGIN
  v_jour_semaine := EXTRACT(DOW FROM p_date)::SMALLINT;

  RETURN EXISTS (
    SELECT 1
    FROM utilisateurs u
    WHERE u.role = 'administrateur'
      AND EXISTS (
        SELECT 1 FROM disponibilites d
        WHERE d.utilisateur_id = u.id
          AND d.jour_semaine = v_jour_semaine
      )
      AND NOT EXISTS (
        SELECT 1 FROM indisponibilites i
        WHERE i.utilisateur_id = u.id
          AND p_date BETWEEN i.date_debut AND i.date_fin
      )
  );
END;
$$;


-- ─────────────────────────────────────────────
-- 2. contact_messages_insert_public : ajout d'un WITH CHECK minimal
-- ─────────────────────────────────────────────
-- On exige au moins une réponse non-nulle pour éviter le SPAM vide
-- et satisfaire le linter (WITH CHECK non trivial).
DROP POLICY IF EXISTS "contact_messages_insert_public" ON contact_messages;
CREATE POLICY "contact_messages_insert_public"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    reponses IS NOT NULL
    AND jsonb_typeof(reponses) = 'object'
    AND lu = FALSE                       -- empêche un attaquant de créer un message déjà "lu"
  );


-- ─────────────────────────────────────────────
-- 3. visites_insert_public : ajout d'un WITH CHECK minimal
-- ─────────────────────────────────────────────
-- On exige une page non vide et bornée, et un user_agent borné.
DROP POLICY IF EXISTS "visites_insert_public" ON visites_site;
CREATE POLICY "visites_insert_public"
  ON visites_site FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    page IS NOT NULL
    AND length(page) BETWEEN 1 AND 255
    AND (user_agent IS NULL OR length(user_agent) <= 500)
    AND (visiteur_hash IS NULL OR length(visiteur_hash) <= 64)
  );


-- ─────────────────────────────────────────────
-- 4. avatars_public_read : drop la SELECT policy
-- ─────────────────────────────────────────────
-- Un bucket marqué public sert ses fichiers via /storage/v1/object/public/...
-- sans passer par RLS. La SELECT policy n'est donc nécessaire que pour
-- LISTER les objets — ce qu'on ne veut pas (le linter remonte ça).
-- L'affichage des avatars via URL continue de fonctionner.
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;


-- ─────────────────────────────────────────────
-- 5a. is_admin : passer en SECURITY INVOKER
-- ─────────────────────────────────────────────
-- is_admin() interroge utilisateurs WHERE id = auth.uid(). N'a pas besoin
-- des privilèges du créateur ; les RLS d'utilisateurs autorisent déjà
-- chacun à lire sa propre ligne. SECURITY INVOKER + grants restreints.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.is_admin() SECURITY INVOKER';
    EXECUTE 'ALTER FUNCTION public.is_admin() SET search_path = public, pg_catalog';
  END IF;
END$$;

-- 5b. decrement_atelier_spots : trigger only → revoke EXECUTE
-- ─────────────────────────────────────────────
-- Cette fonction n'est appelée QUE par le trigger on_inscription_insert,
-- jamais via RPC. On révoque l'exécution publique pour fermer l'API REST
-- et on la sécurise avec un search_path immutable.
ALTER FUNCTION public.decrement_atelier_spots()
  SET search_path = public, pg_catalog;

REVOKE EXECUTE ON FUNCTION public.decrement_atelier_spots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_atelier_spots() FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_atelier_spots() FROM authenticated;


-- 5c. depublier_ateliers_passes : ne plus exposer aux anon, restreindre aux admins
-- ─────────────────────────────────────────────
-- Appelée par /admin/ateliers (admins) et le cron quotidien. On retire
-- l'accès anonyme et on ajoute un check admin à l'intérieur.
CREATE OR REPLACE FUNCTION depublier_ateliers_passes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  nb_maj INTEGER;
BEGIN
  -- Autorisé : admins authentifiés OU exécution interne (cron / postgres)
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM utilisateurs u
       WHERE u.id = auth.uid() AND u.role = 'administrateur'
     )
  THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent appeler depublier_ateliers_passes()';
  END IF;

  UPDATE ateliers
  SET statut = 'termine'
  WHERE date_atelier < CURRENT_DATE
    AND statut IN ('publie', 'complet');

  GET DIAGNOSTICS nb_maj = ROW_COUNT;
  RETURN nb_maj;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.depublier_ateliers_passes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.depublier_ateliers_passes() FROM anon;
GRANT  EXECUTE ON FUNCTION public.depublier_ateliers_passes() TO authenticated;


-- =====================================================
-- ⚠️ À faire manuellement dans le dashboard Supabase :
-- Authentication → Providers → Email → activer
-- "Check passwords against HaveIBeenPwned"
-- (auth_leaked_password_protection)
-- =====================================================
