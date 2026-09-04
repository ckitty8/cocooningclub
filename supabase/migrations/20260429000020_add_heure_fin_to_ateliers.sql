-- Heure de fin optionnelle d'un atelier, en complément de heure_debut/duree.
ALTER TABLE public.ateliers ADD COLUMN heure_fin time;
