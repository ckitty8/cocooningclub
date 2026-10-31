-- Places illimitées : « Places max » peut être laissé vide dans Admin → Ateliers.
--
-- ateliers.places_max et ateliers.places_disponibles deviennent facultatives (NULL = pas de limite). Les contraintes
-- CHECK (> 0 et >= 0) ne s'appliquent pas à NULL. Le déclencheur decrementer_places (20261016000000) n'a pas à changer :
-- « NULL - 1 » et « NULL > 0 » restent NULL, donc aucune ligne d'un atelier illimité n'est modifiée.

ALTER TABLE public.ateliers ALTER COLUMN places_max DROP NOT NULL;
ALTER TABLE public.ateliers ALTER COLUMN places_disponibles DROP NOT NULL;

COMMENT ON COLUMN public.ateliers.places_max IS 'Capacité de l''atelier ; NULL = places illimitées.';
