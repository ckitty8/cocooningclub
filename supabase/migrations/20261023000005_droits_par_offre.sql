-- Droits par offre : un atelier est gratuit, inclus dans l'adhésion ou à payer.
--
-- Règle (identique à src/lib/droits.ts) :
--   1. tarif de l'atelier <= 0                          -> gratuit
--   2. espace de l'atelier « gratuit pour tous »        -> gratuit (Papotages)
--   3. adhésion active non échue dont la formule couvre l'espace de l'atelier -> inclus
--   4. sinon                                            -> à payer (tarif non renseigné = à payer)
-- Le rôle (inscrit / membre / administrateur) ne décide que de l'accès aux pages, jamais des droits.
--
-- Dépend de 20261023000003 (tables formules, formule_espaces, adhesions).

ALTER TABLE public.antennes
  ADD COLUMN IF NOT EXISTS gratuit_pour_tous BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.antennes SET gratuit_pour_tous = TRUE WHERE slug = 'papotages';


-- L'atelier est-il gratuit ou inclus pour cette personne ?
-- p_utilisateur NULL (invité sans compte) : seulement gratuit.
-- Appelable par le déclencheur des inscriptions (qui s'exécute avec les droits de la personne
-- connectée ou du visiteur) : l'adhésion d'une autre personne n'est donc jamais révélée, la
-- fonction répond alors comme s'il n'y en avait pas (sauf pour un administrateur).
CREATE OR REPLACE FUNCTION public.atelier_inclus(p_utilisateur UUID, p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((
    SELECT
      (a.tarif_standard IS NOT NULL AND a.tarif_standard <= 0)
      OR COALESCE(an.gratuit_pour_tous, FALSE)
      OR (
        p_utilisateur IS NOT NULL
        AND (p_utilisateur = auth.uid() OR private.utilisateur_est_admin())
        AND EXISTS (
          SELECT 1
          FROM public.adhesions ad
          JOIN public.formule_espaces fe ON fe.formule_id = ad.formule_id
          WHERE ad.utilisateur_id = p_utilisateur
            AND ad.statut = 'active'
            AND ad.valable_jusqu_au >= current_date
            AND fe.antenne_id = a.antenne_id
        )
      )
    FROM public.ateliers a
    LEFT JOIN public.antennes an ON an.id = a.antenne_id
    WHERE a.id = p_atelier
  ), FALSE);
$$;

-- Droits de la personne connectée (raccourci pour l'interface).
CREATE OR REPLACE FUNCTION public.mon_droit_atelier(p_atelier UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT public.atelier_inclus(auth.uid(), p_atelier);
$$;

REVOKE EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.atelier_inclus(UUID, UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mon_droit_atelier(UUID)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mon_droit_atelier(UUID)   TO authenticated;


-- Le déclencheur des inscriptions (définition de 20261015000000) : seul le calcul de
-- statut_paiement à l'INSERT change. « non_requis » si l'atelier est gratuit ou inclus
-- dans l'adhésion ; sinon « en_attente » (paiement à l'unité).
CREATE OR REPLACE FUNCTION private.proteger_inscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.utilisateur_id IS NOT NULL AND NEW.utilisateur_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Inscription non autorisée pour un autre compte.'
        USING ERRCODE = '42501';
    END IF;

    NEW.statut          := 'en_attente';
    NEW.statut_paiement := CASE WHEN public.atelier_inclus(NEW.utilisateur_id, NEW.atelier_id)
                                THEN 'non_requis' ELSE 'en_attente' END;
    NEW.present         := FALSE;
    NEW.annule_le       := NULL;
    NEW.inscrit_le      := now();
    RETURN NEW;
  END IF;

  -- UPDATE : seule transition permise = annulation.
  IF NEW.statut <> 'annule'
  OR NEW.id              IS DISTINCT FROM OLD.id
  OR NEW.utilisateur_id  IS DISTINCT FROM OLD.utilisateur_id
  OR NEW.atelier_id      IS DISTINCT FROM OLD.atelier_id
  OR NEW.statut_paiement IS DISTINCT FROM OLD.statut_paiement
  OR NEW.present         IS DISTINCT FROM OLD.present
  OR NEW.inscrit_le      IS DISTINCT FROM OLD.inscrit_le
  THEN
    RAISE EXCEPTION 'Modification non autorisée : vous pouvez seulement annuler votre inscription.'
      USING ERRCODE = '42501';
  END IF;

  NEW.annule_le := COALESCE(OLD.annule_le, now());
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.proteger_inscriptions() FROM PUBLIC;
