-- =====================================================
-- Bucket d'images publiques pour ateliers & documents
-- =====================================================
-- Utilisé pour les photos de présentation affichées dans les listes
-- côté membre. Public en lecture (pas de signed URL nécessaire), écriture
-- réservée aux admins.

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "images_admin_write" ON storage.objects;
CREATE POLICY "images_admin_write"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'images' AND public.is_admin())
  WITH CHECK (bucket_id = 'images' AND public.is_admin());

DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');


-- =====================================================
-- Champ url_image pour les documents
-- =====================================================
-- Photo de présentation affichée sur les cartes côté membre, à côté du
-- titre. Si NULL, on retombe sur l'icône/dégradé par défaut.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS url_image TEXT;

COMMENT ON COLUMN public.documents.url_image IS
  'URL publique d''une image de présentation (bucket images). Optionnelle.';
