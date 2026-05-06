-- =====================================================
-- Permettre à l'admin de créer des témoignages libres
-- =====================================================
-- Avant : avis exigeait obligatoirement utilisateur_id + inscription_id
-- (un avis = retour d'expérience après un atelier réellement suivi).
-- Pour pouvoir seeder la home / ajouter des témoignages depuis l'admin
-- sans rattachement à une inscription, on relaxe :
--   - inscription_id et utilisateur_id deviennent nullable
--   - on retire la contrainte UNIQUE sur inscription_id
--   - nouvelle colonne nom_auteur pour stocker le nom quand pas de user
-- =====================================================

ALTER TABLE public.avis
  ALTER COLUMN inscription_id DROP NOT NULL,
  ALTER COLUMN utilisateur_id DROP NOT NULL;

-- Drop contrainte UNIQUE sur inscription_id (idempotent)
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.avis'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%inscription_id%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.avis DROP CONSTRAINT %I', v_constraint);
  END IF;
END$$;

ALTER TABLE public.avis
  ADD COLUMN IF NOT EXISTS nom_auteur VARCHAR(120);

COMMENT ON COLUMN public.avis.nom_auteur IS
  'Nom affiché si l''avis n''est pas rattaché à un compte (témoignage seedé par l''admin).';
