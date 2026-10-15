-- Complète verrouille_colonnes_sensibles.setup.sql avec la table de contact.
CREATE TABLE contact_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar(255), telephone varchar(20), reponses jsonb, lu bool NOT NULL DEFAULT false, cree_le timestamptz NOT NULL DEFAULT now());
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON contact_messages TO anon, authenticated;
CREATE POLICY contact_messages_insert_public ON contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (reponses IS NOT NULL AND jsonb_typeof(reponses) = 'object' AND lu = FALSE);
