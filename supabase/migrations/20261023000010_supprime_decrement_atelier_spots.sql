-- Supprime public.decrement_atelier_spots(), fonction morte relevée par la revue qualité du 23/10 :
-- aucun déclencheur, aucune politique ni fonction ne l'utilise (vérifié en production), et elle modifie
-- une colonne `spots` qui n'existe plus ; decrementer_places() l'a remplacée.
-- Pas de CASCADE : si un objet en dépendait encore, la suppression échouerait au lieu de le casser.
DROP FUNCTION IF EXISTS public.decrement_atelier_spots();
