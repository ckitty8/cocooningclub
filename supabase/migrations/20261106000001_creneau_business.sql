-- Ateliers Business : la participante dit si elle vient toute la journée, le matin ou l'après-midi (06/11).
-- Réponse demandée par le formulaire de pré-inscription des ateliers de l'espace Business, modifiable par
-- l'équipe ; sert aux statistiques du tableau de bord des ateliers. NULL = pas de réponse (autres espaces,
-- pré-inscriptions faites avant cette date).
-- Rejouable sans risque.

ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS creneau TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inscriptions_creneau_valeurs') THEN
    ALTER TABLE public.inscriptions
      ADD CONSTRAINT inscriptions_creneau_valeurs CHECK (creneau IS NULL OR creneau IN ('journee', 'matin', 'apres_midi'));
  END IF;
END
$$;

COMMENT ON COLUMN public.inscriptions.creneau IS
  'Atelier Business : journee = toute la journée, matin, apres_midi ; NULL = pas de réponse.';

-- Filet de sécurité des pré-inscriptions : la réponse est gardée telle quelle (aucune contrainte qui refuse).
ALTER TABLE public.pre_inscriptions_secours
  ADD COLUMN IF NOT EXISTS creneau TEXT;
