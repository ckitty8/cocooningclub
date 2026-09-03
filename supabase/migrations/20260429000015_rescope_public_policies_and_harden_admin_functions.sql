-- =====================================================
-- Rescope des policies TO public + durcissement is_admin() / link_utilisateur_to_auth()
-- =====================================================
-- Plusieurs policies « admin uniquement » étaient scopées TO public
-- (donc évaluées même pour les visiteurs anonymes) au lieu de
-- TO authenticated. Elles n'étaient pas exploitables (auth.uid() vaut
-- NULL pour un visiteur anonyme, la condition ne peut jamais être
-- vraie), mais ce scope trop large empêchait de durcir les GRANT
-- d'exécution sur is_admin(), et l'advisor de sécurité Supabase
-- remontait is_admin()/link_utilisateur_to_auth() comme exécutables
-- par anon (anon_security_definer_function_executable).
-- =====================================================

-- Rescope des policies « admin uniquement » de TO public vers TO authenticated.
ALTER POLICY "avis_creer"              ON public.avis                TO authenticated;
ALTER POLICY "admin_modeles"           ON public.modeles_message     TO authenticated;
ALTER POLICY "transactions_admin"      ON public.transactions_paypal TO authenticated;
ALTER POLICY "transactions_voir_siennes" ON public.transactions_paypal TO authenticated;

-- Ces 3 policies sont volontairement publiques (contenu affiché aux
-- visiteurs non connectés) : on les rend explicites (anon + authenticated)
-- au lieu du rôle "public" générique, sans changer leur comportement.
ALTER POLICY "avis_lecture_approuves"  ON public.avis        TO anon, authenticated;
ALTER POLICY "categories_lecture"      ON public.categories  TO anon, authenticated;
ALTER POLICY "formateurs_lecture"      ON public.formateurs  TO anon, authenticated;

-- Maintenant qu'aucune policy accessible aux visiteurs anonymes ne dépend
-- plus de is_admin(), on retire son exécution à anon (elle reste
-- nécessaire pour authenticated, utilisée dans les policies admin).
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- link_utilisateur_to_auth() est une fonction trigger (RETURNS trigger) :
-- Postgres refuse structurellement de l'exécuter hors du contexte réel
-- d'un trigger, donc aucun rôle n'a besoin d'un droit d'exécution direct.
-- Le trigger continue de fonctionner normalement (son déclenchement ne
-- dépend pas des GRANT d'exécution directe de la fonction).
REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.link_utilisateur_to_auth() FROM PUBLIC;
