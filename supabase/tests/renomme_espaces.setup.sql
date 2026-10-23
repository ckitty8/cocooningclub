-- État de la prod avant 20261023000003_renomme_antennes_en_espaces.sql :
-- table antennes (ex-categories, avec les noms d'origine des contraintes et index).
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
CREATE TABLE categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nom varchar(100) NOT NULL UNIQUE, slug varchar(100) NOT NULL UNIQUE, ordre_affichage int NOT NULL DEFAULT 0);
CREATE INDEX idx_categories_ordre ON categories(ordre_affichage);
CREATE TABLE ateliers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titre text, categorie_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, date_atelier date, statut text DEFAULT 'publie');
CREATE INDEX idx_ateliers_categorie ON ateliers(categorie_id);
ALTER TABLE categories RENAME TO antennes;
ALTER TABLE ateliers RENAME COLUMN categorie_id TO antenne_id;
ALTER TABLE ateliers RENAME CONSTRAINT ateliers_categorie_id_fkey TO ateliers_antenne_id_fkey;
ALTER TABLE antennes ENABLE ROW LEVEL SECURITY;
CREATE POLICY antennes_lecture ON antennes FOR SELECT TO anon USING (true);
CREATE POLICY antennes_admin ON antennes FOR ALL TO anon USING (false);
CREATE VIEW vue_prochains_ateliers AS SELECT a.id, c.nom AS antenne, c.slug AS antenne_slug FROM ateliers a JOIN antennes c ON c.id = a.antenne_id;
CREATE VIEW vue_avis_publies AS SELECT a.id, c.nom AS antenne FROM ateliers a JOIN antennes c ON c.id = a.antenne_id;
GRANT SELECT ON antennes, ateliers, vue_prochains_ateliers TO anon;
INSERT INTO antennes (id, nom, slug, ordre_affichage) VALUES ('cccccccc-0000-0000-0000-000000000001', 'Papotages', 'papotages', 0);
INSERT INTO ateliers (titre, antenne_id, date_atelier) VALUES ('Café', 'cccccccc-0000-0000-0000-000000000001', current_date);
