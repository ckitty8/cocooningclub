-- Scénarios de 20261031000001_places_illimitees.sql. Base jetable autonome : crée des tables minimales (même structure
-- que la prod pour les colonnes de places) et reprend le déclencheur decrementer_places de 20261016000000.
\set ON_ERROR_STOP off
DROP TABLE IF EXISTS inscriptions, ateliers CASCADE;
CREATE TABLE ateliers (
  id UUID PRIMARY KEY,
  places_max INTEGER NOT NULL DEFAULT 10 CHECK (places_max > 0),
  places_disponibles INTEGER NOT NULL DEFAULT 10 CHECK (places_disponibles >= 0)
);
CREATE TABLE inscriptions (id SERIAL PRIMARY KEY, atelier_id UUID REFERENCES ateliers(id), statut TEXT NOT NULL);
CREATE OR REPLACE FUNCTION public.decrementer_places() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut = 'confirme' AND (TG_OP = 'INSERT' OR OLD.statut <> 'confirme') THEN
    UPDATE ateliers SET places_disponibles = places_disponibles - 1 WHERE id = NEW.atelier_id AND places_disponibles > 0;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'confirme' AND NEW.statut IN ('annule', 'en_attente') THEN
    UPDATE ateliers SET places_disponibles = places_disponibles + 1 WHERE id = NEW.atelier_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inscription_places AFTER INSERT OR UPDATE ON inscriptions FOR EACH ROW EXECUTE FUNCTION decrementer_places();

\echo '--- 1. Avant la migration : places_max NULL est refusé (attendu : erreur not-null)'
INSERT INTO ateliers (id, places_max, places_disponibles) VALUES ('11111111-1111-1111-1111-111111111111', NULL, NULL);

\i supabase/migrations/20261031000001_places_illimitees.sql

\echo '--- 2. Après la migration : un atelier illimité s''enregistre (attendu : INSERT 0 1)'
INSERT INTO ateliers (id, places_max, places_disponibles) VALUES ('11111111-1111-1111-1111-111111111111', NULL, NULL);
INSERT INTO ateliers (id, places_max, places_disponibles) VALUES ('22222222-2222-2222-2222-222222222222', 2, 2);

\echo '--- 3. Les contraintes restent actives pour un atelier limité (attendu : 2 erreurs check)'
INSERT INTO ateliers (id, places_max, places_disponibles) VALUES ('33333333-3333-3333-3333-333333333333', 0, 0);
INSERT INTO ateliers (id, places_max, places_disponibles) VALUES ('44444444-4444-4444-4444-444444444444', 5, -1);

\echo '--- 4. Inscriptions confirmées sur l''atelier illimité : les places restent NULL, aucune erreur'
INSERT INTO inscriptions (atelier_id, statut) VALUES ('11111111-1111-1111-1111-111111111111', 'confirme'), ('11111111-1111-1111-1111-111111111111', 'confirme');
UPDATE inscriptions SET statut = 'annule' WHERE id = 1;
SELECT places_max IS NULL AS max_null, places_disponibles IS NULL AS dispo_null FROM ateliers WHERE id = '11111111-1111-1111-1111-111111111111';

\echo '--- 5. Atelier limité : toujours décompté (attendu : 1)'
INSERT INTO inscriptions (atelier_id, statut) VALUES ('22222222-2222-2222-2222-222222222222', 'confirme');
SELECT places_disponibles FROM ateliers WHERE id = '22222222-2222-2222-2222-222222222222';
