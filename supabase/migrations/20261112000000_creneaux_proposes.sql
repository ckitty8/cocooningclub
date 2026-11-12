-- Ateliers Business : choix « Je serai présente » proposés par le formulaire de pré-inscription (12/11).
-- L'équipe coche, dans la fiche de l'atelier, les choix gardés parmi journee / matin / apres_midi.
-- NULL = les trois (comportement d'avant) ; tableau vide = la question n'est pas posée.
-- Lisible par les visiteuses comme les autres colonnes de l'atelier (aucune politique modifiée).
-- Rejouable sans risque.

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS creneaux_proposes TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ateliers_creneaux_proposes_valeurs') THEN
    ALTER TABLE public.ateliers
      ADD CONSTRAINT ateliers_creneaux_proposes_valeurs
      CHECK (creneaux_proposes IS NULL OR creneaux_proposes <@ ARRAY['journee', 'matin', 'apres_midi']::TEXT[]);
  END IF;
END
$$;

COMMENT ON COLUMN public.ateliers.creneaux_proposes IS
  'Choix « Je serai présente » proposés (journee, matin, apres_midi) ; NULL = les trois ; vide = question non posée.';
