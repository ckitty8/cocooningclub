-- Scénarios de 20261103000001_creneaux_business.sql. Base jetable autonome (depuis la racine du dépôt) :
--   createdb c && psql -d c -f supabase/tests/creneaux_business.test.sql
\set ON_ERROR_STOP off
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
END $$;
DROP TABLE IF EXISTS inscriptions, ateliers, pre_inscriptions_secours CASCADE;
CREATE TABLE ateliers (id UUID PRIMARY KEY, titre TEXT);
CREATE TABLE inscriptions (id SERIAL PRIMARY KEY, atelier_id UUID REFERENCES ateliers(id), statut TEXT NOT NULL DEFAULT 'en_attente');
CREATE TABLE pre_inscriptions_secours (id SERIAL PRIMARY KEY, nom TEXT);

\i supabase/migrations/20261103000001_creneaux_business.sql
\echo '--- 0. Rejouable (attendu : aucune erreur)'
\i supabase/migrations/20261103000001_creneaux_business.sql

\echo '--- 1. Créneaux enregistrés sur l''atelier (attendu : INSERT 0 2)'
INSERT INTO ateliers VALUES ('11111111-1111-1111-1111-111111111111', 'Journée Création Instagram');
UPDATE ateliers SET creneaux = '{"matin": {"debut": "10:00", "fin": "13:00", "places": 2}, "apres_midi": {"debut": "14:00", "fin": "17:00"}, "journee": {"tarif": 40}}'
  WHERE id = '11111111-1111-1111-1111-111111111111';
INSERT INTO ateliers VALUES ('22222222-2222-2222-2222-222222222222', 'Sans créneau');

\echo '--- 2. Un tableau n''est pas accepté comme créneaux (attendu : erreur check ateliers_creneaux_objet)'
UPDATE ateliers SET creneaux = '[1, 2]' WHERE id = '22222222-2222-2222-2222-222222222222';

\echo '--- 3. Créneau inconnu refusé (attendu : erreur check inscriptions_creneau_valide)'
INSERT INTO inscriptions (atelier_id, creneau) VALUES ('11111111-1111-1111-1111-111111111111', 'soir');

\echo '--- 4. Places prises : seules les validées comptent, la journée compte matin ET après-midi (attendu : matin 2, apres_midi 2)'
INSERT INTO inscriptions (atelier_id, creneau, statut) VALUES
  ('11111111-1111-1111-1111-111111111111', 'matin', 'confirme'),
  ('11111111-1111-1111-1111-111111111111', 'journee', 'confirme'),
  ('11111111-1111-1111-1111-111111111111', 'apres_midi', 'confirme'),
  ('11111111-1111-1111-1111-111111111111', 'apres_midi', 'en_attente'),
  ('11111111-1111-1111-1111-111111111111', 'matin', 'annule');
SELECT * FROM public.places_creneaux('11111111-1111-1111-1111-111111111111');

\echo '--- 5. Atelier sans créneau et ancienne ligne sans créneau (attendu : matin 0, apres_midi 0)'
INSERT INTO inscriptions (atelier_id, statut) VALUES ('22222222-2222-2222-2222-222222222222', 'confirme');
SELECT * FROM public.places_creneaux('22222222-2222-2222-2222-222222222222');

\echo '--- 6. Les visiteurs peuvent appeler la fonction, pas PUBLIC en général (attendu : t, t)'
SELECT has_function_privilege('anon', 'public.places_creneaux(uuid)', 'EXECUTE') AS anon,
       has_function_privilege('authenticated', 'public.places_creneaux(uuid)', 'EXECUTE') AS authentifiee;

\echo '--- 7. Le filet de sécurité garde le créneau (attendu : INSERT 0 1)'
INSERT INTO pre_inscriptions_secours (nom, creneau) VALUES ('Allain', 'journee');
