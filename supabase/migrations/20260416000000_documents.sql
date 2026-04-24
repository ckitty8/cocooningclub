-- =====================================================
-- Table documents + bucket storage
-- =====================================================

-- 1. Enums
DROP TYPE IF EXISTS type_document CASCADE;
CREATE TYPE type_document AS ENUM ('magazine', 'guide', 'lien_externe');

DROP TYPE IF EXISTS acces_document CASCADE;
CREATE TYPE acces_document AS ENUM ('membres', 'premium', 'tous');

-- 2. Table documents
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre         VARCHAR(200) NOT NULL,
  description   TEXT,
  type          type_document NOT NULL DEFAULT 'guide',
  fichier_url   TEXT,
  lien_externe  TEXT,
  acces         acces_document NOT NULL DEFAULT 'membres',
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_le    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Contrainte : soit un fichier, soit un lien
  CONSTRAINT chk_documents_source CHECK (
    (type = 'lien_externe' AND lien_externe IS NOT NULL)
    OR (type != 'lien_externe' AND fichier_url IS NOT NULL)
    OR (type != 'lien_externe' AND fichier_url IS NULL) -- tolère NULL temporairement (avant upload)
  )
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_acces ON documents(acces);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- Trigger modifie_le
DROP TRIGGER IF EXISTS trg_documents_modifie_le ON documents;
CREATE TRIGGER trg_documents_modifie_le
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

COMMENT ON TABLE documents IS 'Documents & ressources (magazines, guides, liens externes) pour les membres.';

-- 3. RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admin : tout
DROP POLICY IF EXISTS "documents_admin_all" ON documents;
CREATE POLICY "documents_admin_all"
  ON documents FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- Membres premium : lecture de 'tous' + 'premium' + 'membres'
DROP POLICY IF EXISTS "documents_lecture_premium" ON documents;
CREATE POLICY "documents_lecture_premium"
  ON documents FOR SELECT
  TO authenticated
  USING (
    acces IN ('tous', 'premium', 'membres')
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'membre_premium')
  );

-- Membres standard : lecture de 'tous' + 'membres'
DROP POLICY IF EXISTS "documents_lecture_membre" ON documents;
CREATE POLICY "documents_lecture_membre"
  ON documents FOR SELECT
  TO authenticated
  USING (
    acces IN ('tous', 'membres')
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'membre_standard')
  );

-- 4. Bucket storage pour les fichiers PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques du bucket : admin peut upload/delete, public peut lire
DROP POLICY IF EXISTS "documents_bucket_admin_write" ON storage.objects;
CREATE POLICY "documents_bucket_admin_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur')
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur')
  );

DROP POLICY IF EXISTS "documents_bucket_public_read" ON storage.objects;
CREATE POLICY "documents_bucket_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'documents');
