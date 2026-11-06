-- Scénarios de 20261106000001_creneau_business.sql. Base jetable autonome (tables minimales, schéma public).
-- À lancer depuis la racine du dépôt : createdb c && psql -d c -f supabase/tests/creneau_business.test.sql
\set ON_ERROR_STOP off
DROP TABLE IF EXISTS public.inscriptions, public.pre_inscriptions_secours CASCADE;
CREATE TABLE public.inscriptions (id SERIAL PRIMARY KEY, statut TEXT NOT NULL DEFAULT 'en_attente');
CREATE TABLE public.pre_inscriptions_secours (id SERIAL PRIMARY KEY, nom TEXT NOT NULL DEFAULT 'Sans nom');

\i supabase/migrations/20261106000001_creneau_business.sql
\echo '--- Rejouée une 2e fois sans erreur (attendu : aucune erreur)'
\i supabase/migrations/20261106000001_creneau_business.sql

\echo '--- 1. Les trois réponses et « pas de réponse » sont acceptées (attendu : INSERT 0 4)'
INSERT INTO public.inscriptions (creneau) VALUES ('journee'), ('matin'), ('apres_midi'), (NULL);
\echo '--- 2. Une autre valeur est refusée (attendu : erreur inscriptions_creneau_valeurs)'
INSERT INTO public.inscriptions (creneau) VALUES ('soir');
\echo '--- 3. La demande de secours garde n''importe quelle valeur (attendu : INSERT 0 1)'
INSERT INTO public.pre_inscriptions_secours (creneau) VALUES ('soir');
\echo '--- 4. Une seule contrainte (attendu : 1)'
SELECT count(*) FROM pg_constraint WHERE conname = 'inscriptions_creneau_valeurs';
