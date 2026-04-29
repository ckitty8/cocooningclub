-- =====================================================
-- documents bucket : passage en privé + signed URLs
-- =====================================================
-- Avant : bucket public + policy SELECT pour anon → toute personne
-- connaissant ou devinant l'URL pouvait télécharger un PDF (membres,
-- premium), bypassant entièrement le RLS de la table documents.
--
-- Après : bucket privé. Lecture autorisée uniquement si l'appelant
-- a aussi accès à la ligne `documents` qui pointe vers le fichier
-- (RLS de la table documents). Le frontend doit générer une signed
-- URL (createSignedUrl) au moment de l'ouverture.
-- =====================================================

-- 1. On stocke aussi le chemin du fichier (pour pouvoir signer plus tard)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS fichier_chemin TEXT;

-- Backfill : extrait le path à partir des URLs publiques existantes
-- /storage/v1/object/public/documents/<path>
UPDATE documents
SET fichier_chemin = regexp_replace(
  fichier_url,
  '^.*/storage/v1/object/public/documents/',
  ''
)
WHERE fichier_url IS NOT NULL
  AND fichier_chemin IS NULL
  AND fichier_url LIKE '%/storage/v1/object/public/documents/%';

COMMENT ON COLUMN documents.fichier_chemin IS
  'Chemin de l''objet dans le bucket documents (privé). Signé à la volée côté client.';

-- 2. Bucket privé
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 3. Drop l'ancienne policy publique
DROP POLICY IF EXISTS "documents_bucket_public_read" ON storage.objects;

-- 4. Lecture du fichier autorisée seulement s'il existe une ligne
--    documents que l'appelant peut SELECT (les policies RLS de la table
--    documents font le filtre rôle / acces).
DROP POLICY IF EXISTS "documents_bucket_authorized_read" ON storage.objects;
CREATE POLICY "documents_bucket_authorized_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM documents d
      WHERE d.fichier_chemin = storage.objects.name
    )
  );

-- 5. La policy admin (documents_bucket_admin_write) reste inchangée :
--    les admins peuvent toujours upload / delete via storage.objects.
--    Pour info, on s'assure qu'elle existe et qu'elle est correcte.
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
