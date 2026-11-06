-- Compte Instagram facultatif demandé par le formulaire de pré-inscription (06/11).
-- Le site enregistre « @moncompte » (saisie « moncompte », « @moncompte » ou lien du profil ramenée à cette forme).
-- NULL = pas de réponse (champ facultatif, pré-inscriptions faites avant cette date).
-- Rejouable sans risque.

ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS instagram TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inscriptions_instagram_longueur') THEN
    ALTER TABLE public.inscriptions
      ADD CONSTRAINT inscriptions_instagram_longueur CHECK (instagram IS NULL OR char_length(instagram) <= 100);
  END IF;
END
$$;

COMMENT ON COLUMN public.inscriptions.instagram IS
  'Compte Instagram donné dans le formulaire de pré-inscription (« @moncompte ») ; NULL = pas de réponse.';

-- Filet de sécurité des pré-inscriptions : la réponse est gardée telle quelle (aucune contrainte qui refuse).
ALTER TABLE public.pre_inscriptions_secours
  ADD COLUMN IF NOT EXISTS instagram TEXT;
