-- =====================================================
-- Corrige vue_prochains_ateliers : SECURITY INVOKER
-- =====================================================
-- Sans l'option `security_invoker`, une vue Postgres s'exécute par
-- défaut avec les droits de son créateur plutôt que ceux de
-- l'appelant, ce qui la fait bypasser les policies RLS de la table
-- sous-jacente. La vue vue_prochains_ateliers a été recréée par la
-- migration 20260429000012 (retrait de tarif_premium) sans reprendre
-- cette option, comme sa définition d'origine — l'advisor de sécurité
-- Supabase remonte ce point en niveau ERROR (security_definer_view).
--
-- Impact réel limité ici : la vue filtre déjà sur les ateliers publiés
-- à venir (données publiques par nature), mais on corrige quand même
-- pour suivre les bonnes pratiques Postgres/Supabase.
-- =====================================================

ALTER VIEW public.vue_prochains_ateliers SET (security_invoker = true);
