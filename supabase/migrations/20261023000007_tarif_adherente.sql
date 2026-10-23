-- Deux tarifs par atelier : non-adhérente (tarif_standard, inchangé) et adhérente (tarif_adherent).
--
-- Une adhérente (au moins une adhésion active non échue) dont la formule ne couvre pas l'espace de
-- l'atelier paie le tarif adhérente s'il est renseigné ; sinon tout le monde paie tarif_standard.
-- Un atelier de l'espace couvert par sa formule reste « inclus ». Règle identique à src/lib/droits.ts.
-- Dépend de 20261023000005 (fonction atelier_inclus, remplacée ici).

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS tarif_adherent NUMERIC(8,2) CHECK (tarif_adherent IS NULL OR tarif_adherent >= 0);

COMMENT ON COLUMN public.ateliers.tarif_adherent IS
  'Prix pour une adhérente hors de son espace ; NULL = même prix que tarif_standard (prix non-adhérente).';

-- Atelier gratuit ou inclus pour cette personne (même signature qu'en 000005).
CREATE OR REPLACE FUNCTION public.atelier_inclus(p_utilisateur UUID, p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH visible AS (
    -- L'adhésion d'une autre personne n'est jamais révélée (sauf à un administrateur).
    SELECT p_utilisateur AS id
    WHERE p_utilisateur IS NOT NULL
      AND (p_utilisateur = auth.uid() OR private.utilisateur_est_admin())
  ),
  adhesions_en_cours AS (
    SELECT ad.formule_id
    FROM public.adhesions ad
    JOIN visible v ON v.id = ad.utilisateur_id
    WHERE ad.statut = 'active' AND ad.valable_jusqu_au >= current_date
  )
  SELECT COALESCE((
    SELECT
      COALESCE(
        CASE WHEN EXISTS (SELECT 1 FROM adhesions_en_cours) THEN a.tarif_adherent END,
        a.tarif_standard
      ) <= 0
      OR COALESCE(an.gratuit_pour_tous, FALSE)
      OR EXISTS (
        SELECT 1
        FROM adhesions_en_cours ae
        JOIN public.formule_espaces fe ON fe.formule_id = ae.formule_id
        WHERE fe.antenne_id = a.antenne_id
      )
    FROM public.ateliers a
    LEFT JOIN public.antennes an ON an.id = a.antenne_id
    WHERE a.id = p_atelier
  ), FALSE);
$$;

REVOKE EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) TO anon, authenticated;
