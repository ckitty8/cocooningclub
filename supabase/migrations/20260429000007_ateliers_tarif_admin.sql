-- =====================================================
-- Champ admin-only : tarif interne sur ateliers
-- =====================================================
-- Le champ `tarif_admin` est saisi par l'admin dans /admin/ateliers
-- (par ex. coût réel / coût formateur / marge interne) et n'est jamais
-- affiché côté membre. Côté code, les SELECT membres listent
-- explicitement les colonnes pour ne pas le ramener.
--
-- Pas de RLS column-level : les rôles authenticated/anon ne sont pas
-- distingués au niveau colonne, on s'appuie sur la couche applicative.
-- =====================================================

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS tarif_admin DECIMAL(10, 2);

COMMENT ON COLUMN public.ateliers.tarif_admin IS
  'Tarif interne admin (coût formateur, marge, etc.). Non exposé côté membre.';
