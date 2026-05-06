-- =====================================================
-- Champ optionnel : date de fin d'inscription d'un atelier
-- =====================================================
-- Si rempli, indique la date jusqu'à laquelle on peut s'inscrire.
-- Affiché côté public (page d'accueil) uniquement quand il est rempli.
-- Pas de contrainte côté DB sur les inscriptions tardives — c'est un
-- libellé informatif. À durcir plus tard si besoin (trigger ou check).
-- =====================================================

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS date_fin_inscription DATE;

COMMENT ON COLUMN public.ateliers.date_fin_inscription IS
  'Date limite d''inscription affichée aux visiteurs. Optionnel.';
