-- Créneaux d'inscription des ateliers Business : la matinée, l'après-midi ou la journée entière.
--
-- 1. ateliers.creneaux (JSON, facultatif) : créneaux proposés, une clé par créneau coché dans Admin → Ateliers :
--      {"matin":      {"debut": "10:00", "fin": "13:00", "places": 8, "tarif": 25, "tarif_adherent": 20},
--       "apres_midi": {"debut": "14:00", "fin": "17:00", "places": null, ...},
--       "journee":    {"tarif": 40, "tarif_adherent": 30}}
--    Tarifs facultatifs (absents = tarifs de l'atelier) ; places null = illimitées ; la journée entière prend
--    une place le matin ET une l'après-midi. NULL = pas de créneau (inscription à l'atelier comme avant).
-- 2. inscriptions.creneau : créneau choisi par la personne (NULL pour les ateliers sans créneau et les anciennes lignes).
--    Le déclencheur private.proteger_inscriptions ne le touche pas : la personne le choisit à l'inscription,
--    puis ne peut plus le modifier (seule l'annulation lui est permise) ; une administratrice peut le changer.
-- 3. pre_inscriptions_secours.creneau : le choix est gardé aussi dans le filet de sécurité (aucune contrainte).
-- 4. public.places_creneaux(atelier) : places prises (pré-inscriptions validées) le matin et l'après-midi,
--    lisible par les visiteurs (le formulaire grise un créneau complet) sans exposer les inscriptions.
-- Rien ne change pour les droits : une adhérente dont la formule couvre Business a l'atelier inclus quel que soit le créneau.
-- Ajout pur, rejouable : l'ancien code du site continue de fonctionner.

ALTER TABLE public.ateliers
  ADD COLUMN IF NOT EXISTS creneaux JSONB;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ateliers_creneaux_objet' AND conrelid = 'public.ateliers'::regclass) THEN
    ALTER TABLE public.ateliers ADD CONSTRAINT ateliers_creneaux_objet
      CHECK (creneaux IS NULL OR (jsonb_typeof(creneaux) = 'object' AND length(creneaux::text) <= 2000));
  END IF;
END
$$;

COMMENT ON COLUMN public.ateliers.creneaux IS
  'Créneaux proposés à l''inscription (ateliers Business) : {matin, apres_midi : {debut, fin, places, tarif, tarif_adherent}, journee : {tarif, tarif_adherent}} ; NULL = aucun.';

ALTER TABLE public.inscriptions
  ADD COLUMN IF NOT EXISTS creneau TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inscriptions_creneau_valide' AND conrelid = 'public.inscriptions'::regclass) THEN
    ALTER TABLE public.inscriptions ADD CONSTRAINT inscriptions_creneau_valide
      CHECK (creneau IS NULL OR creneau IN ('matin', 'apres_midi', 'journee'));
  END IF;
END
$$;

COMMENT ON COLUMN public.inscriptions.creneau IS 'Créneau choisi : matin, apres_midi ou journee ; NULL = atelier sans créneau.';

ALTER TABLE public.pre_inscriptions_secours
  ADD COLUMN IF NOT EXISTS creneau TEXT;

CREATE OR REPLACE FUNCTION public.places_creneaux(p_atelier UUID)
RETURNS TABLE (matin INTEGER, apres_midi INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(*) FILTER (WHERE i.creneau IN ('matin', 'journee'))::integer,
    count(*) FILTER (WHERE i.creneau IN ('apres_midi', 'journee'))::integer
  FROM public.inscriptions i
  WHERE i.atelier_id = p_atelier AND i.statut = 'confirme';
$$;

REVOKE ALL ON FUNCTION public.places_creneaux(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.places_creneaux(UUID) TO anon, authenticated;
