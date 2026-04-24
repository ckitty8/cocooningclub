-- =====================================================
-- Tracking des visites du site
-- =====================================================
-- Chaque pageview côté public est inséré ici.
-- Admins uniquement peuvent lire les stats.
-- =====================================================

CREATE TABLE IF NOT EXISTS visites_site (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page           VARCHAR(255) NOT NULL,
  referrer       TEXT,
  user_agent     TEXT,
  visiteur_hash  VARCHAR(64),  -- UUID stable stocké en localStorage côté client (permet de compter les uniques)
  cree_le        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visites_cree_le ON visites_site(cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_visites_page ON visites_site(page);
CREATE INDEX IF NOT EXISTS idx_visites_visiteur_hash ON visites_site(visiteur_hash);

COMMENT ON TABLE visites_site IS 'Log des visites du site public. Chaque ligne = un pageview.';

-- RLS
ALTER TABLE visites_site ENABLE ROW LEVEL SECURITY;

-- Insertion publique (pour que tous les visiteurs, même anonymes, puissent logger)
DROP POLICY IF EXISTS "visites_insert_public" ON visites_site;
CREATE POLICY "visites_insert_public"
  ON visites_site FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Lecture par admins uniquement
DROP POLICY IF EXISTS "visites_admin_lecture" ON visites_site;
CREATE POLICY "visites_admin_lecture"
  ON visites_site FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));
