-- Schéma minimal imitant la prod avant 20261023000001_conservation_des_donnees.sql.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;  -- comme en prod : seul EXECUTE doit bloquer
CREATE TABLE ateliers (id uuid PRIMARY KEY, titre text, date_atelier date NOT NULL);
CREATE TABLE utilisateurs (id uuid PRIMARY KEY, email text);
CREATE TABLE inscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id uuid NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
  utilisateur_id uuid REFERENCES utilisateurs(id),
  nom_invite varchar(100), prenom_invite varchar(100), email_invite varchar(255),
  telephone_invite text, date_naissance date,
  statut text NOT NULL DEFAULT 'confirme', present boolean NOT NULL DEFAULT false,
  CONSTRAINT chk_participant CHECK (utilisateur_id IS NOT NULL OR (nom_invite IS NOT NULL AND prenom_invite IS NOT NULL AND email_invite IS NOT NULL))
);
CREATE TABLE visites_site (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page text, cree_le timestamptz NOT NULL DEFAULT now());
CREATE TABLE logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action varchar(100) NOT NULL, horodatage timestamptz NOT NULL DEFAULT now());
CREATE TABLE contact_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, cree_le timestamptz NOT NULL DEFAULT now());

INSERT INTO ateliers VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Ancien',  current_date - INTERVAL '4 years'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Récent',  current_date - INTERVAL '1 year');
INSERT INTO utilisateurs VALUES ('11111111-1111-1111-1111-111111111111', 'membre@x.fr');
INSERT INTO inscriptions (id, atelier_id, utilisateur_id, nom_invite, prenom_invite, email_invite, telephone_invite, date_naissance, present) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', NULL, 'Martin', 'Léa', 'lea@x.fr', '0612345678', '1990-05-17', true),   -- invitée, atelier ancien : anonymisée
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', NULL, 'Durand', 'Paul', 'paul@x.fr', '0611111111', '1985-01-01', false), -- invité, atelier récent : conservé
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL, NULL, '1992-02-02', true); -- membre, atelier ancien : jamais touché
INSERT INTO visites_site (page, cree_le) VALUES ('/', now() - INTERVAL '14 months'), ('/', now() - INTERVAL '12 months'), ('/', now());
INSERT INTO logs (action, horodatage) VALUES ('atelier.create', now() - INTERVAL '13 months'), ('atelier.update', now() - INTERVAL '11 months');
INSERT INTO contact_messages (email, cree_le) VALUES ('vieux@x.fr', now() - INTERVAL '37 months'), ('recent@x.fr', now() - INTERVAL '35 months');
