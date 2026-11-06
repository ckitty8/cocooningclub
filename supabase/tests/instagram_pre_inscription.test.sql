-- Scénarios de 20261106000002_instagram_pre_inscription.sql. Base jetable autonome (tables minimales, schéma public).
-- À lancer depuis la racine du dépôt : createdb c && psql -d c -f supabase/tests/instagram_pre_inscription.test.sql
\set ON_ERROR_STOP off
DROP TABLE IF EXISTS public.inscriptions, public.pre_inscriptions_secours CASCADE;
CREATE TABLE public.inscriptions (id SERIAL PRIMARY KEY, statut TEXT NOT NULL DEFAULT 'en_attente');
CREATE TABLE public.pre_inscriptions_secours (id SERIAL PRIMARY KEY, nom TEXT NOT NULL DEFAULT 'Sans nom');

\i supabase/migrations/20261106000002_instagram_pre_inscription.sql
\echo '--- Rejouée une 2e fois sans erreur (attendu : aucune erreur)'
\i supabase/migrations/20261106000002_instagram_pre_inscription.sql

\echo '--- 1. Un compte et « pas de réponse » sont acceptés (attendu : INSERT 0 2)'
INSERT INTO public.inscriptions (instagram) VALUES ('@moncompte'), (NULL);
\echo '--- 2. Plus de 100 caractères est refusé (attendu : erreur inscriptions_instagram_longueur)'
INSERT INTO public.inscriptions (instagram) VALUES (repeat('a', 101));
\echo '--- 3. La demande de secours garde n''importe quelle valeur (attendu : INSERT 0 1)'
INSERT INTO public.pre_inscriptions_secours (instagram) VALUES (repeat('a', 300));
\echo '--- 4. Une seule contrainte (attendu : 1)'
SELECT count(*) FROM pg_constraint WHERE conname = 'inscriptions_instagram_longueur';
