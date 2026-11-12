-- Scénarios de 20261112000000_creneaux_proposes.sql. Base jetable autonome (table minimale, schéma public).
-- À lancer depuis la racine du dépôt : createdb c && psql -d c -f supabase/tests/creneaux_proposes.test.sql
\set ON_ERROR_STOP off
DROP TABLE IF EXISTS public.ateliers CASCADE;
CREATE TABLE public.ateliers (id SERIAL PRIMARY KEY, titre TEXT NOT NULL DEFAULT 'Atelier');

\i supabase/migrations/20261112000000_creneaux_proposes.sql
\echo '--- Rejouée une 2e fois sans erreur (attendu : aucune erreur)'
\i supabase/migrations/20261112000000_creneaux_proposes.sql

\echo '--- 1. NULL, vide, un choix, deux choix sont acceptés (attendu : INSERT 0 4)'
INSERT INTO public.ateliers (creneaux_proposes) VALUES (NULL), ('{}'), ('{matin}'), ('{journee,apres_midi}');
\echo '--- 2. Une autre valeur est refusée (attendu : erreur ateliers_creneaux_proposes_valeurs)'
INSERT INTO public.ateliers (creneaux_proposes) VALUES ('{soir}');
\echo '--- 3. Une seule contrainte (attendu : 1)'
SELECT count(*) FROM pg_constraint WHERE conname = 'ateliers_creneaux_proposes_valeurs';
