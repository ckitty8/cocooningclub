-- Ateliers Business : programme du matin et de l'après-midi, en saisie libre (Admin → Ateliers, espace Business ;
-- affichés sur la tuile de l'atelier, page d'accueil). Colonnes facultatives, aucune politique à modifier.

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS matin      TEXT CHECK (matin IS NULL OR length(matin) <= 300),
  ADD COLUMN IF NOT EXISTS apres_midi TEXT CHECK (apres_midi IS NULL OR length(apres_midi) <= 300);
