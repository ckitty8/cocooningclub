-- =====================================================
-- Bucket storage "avatars" pour les photos de profil
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Les utilisateurs connectés peuvent uploader / remplacer dans ce bucket
DROP POLICY IF EXISTS "avatars_authenticated_write" ON storage.objects;
CREATE POLICY "avatars_authenticated_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- Lecture publique (pour que les avatars s'affichent partout)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');
