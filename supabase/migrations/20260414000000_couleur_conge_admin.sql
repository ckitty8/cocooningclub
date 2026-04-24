-- =====================================================
-- Couleur personnelle des congés par admin
-- =====================================================
-- Chaque admin peut choisir une couleur (parmi 8) pour
-- afficher ses congés dans le calendrier récap.
-- Contrainte : une couleur ne peut être utilisée que par 1 admin.
-- =====================================================

-- 0. Renommer l'ancienne colonne si elle existe (migration idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'utilisateurs' AND column_name = 'couleur_conge') THEN
    ALTER TABLE utilisateurs RENAME COLUMN couleur_conge TO couleur_conges;
  END IF;
END $$;

-- Renommer aussi l'ancien index/contrainte s'ils existent
ALTER INDEX IF EXISTS uniq_utilisateurs_couleur_conge RENAME TO uniq_utilisateurs_couleur_conges;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_utilisateurs_couleur_conge') THEN
    ALTER TABLE utilisateurs RENAME CONSTRAINT chk_utilisateurs_couleur_conge TO chk_utilisateurs_couleur_conges;
  END IF;
END $$;

-- 1. Ajouter la colonne couleur_conges si elle n'existe pas encore
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS couleur_conges VARCHAR(20);

COMMENT ON COLUMN utilisateurs.couleur_conges IS
  'Clé de couleur (teal, blue, fuchsia, pink, violet, orange, gray, brown) affichée sur le calendrier pour les congés de cet admin. NULL = non choisie.';

-- 2. Contrainte : une couleur ne peut être utilisée que par 1 utilisateur (UNIQUE partial index pour autoriser plusieurs NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_utilisateurs_couleur_conges
  ON utilisateurs(couleur_conges)
  WHERE couleur_conges IS NOT NULL;

-- 3. Couleurs valides via CHECK
ALTER TABLE utilisateurs
  DROP CONSTRAINT IF EXISTS chk_utilisateurs_couleur_conges;

ALTER TABLE utilisateurs
  ADD CONSTRAINT chk_utilisateurs_couleur_conges
  CHECK (
    couleur_conges IS NULL
    OR couleur_conges IN ('teal', 'blue', 'fuchsia', 'pink', 'violet', 'orange', 'gray', 'brown')
  );

-- 4. Colonne pour stocker le code hexadécimal de la couleur
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS code_couleur_conges VARCHAR(7);

COMMENT ON COLUMN utilisateurs.code_couleur_conges IS
  'Code hexadécimal (#rrggbb) de la couleur de congés, synchronisé avec couleur_conges.';

-- Contrainte format hexa (#rrggbb) ou NULL
ALTER TABLE utilisateurs
  DROP CONSTRAINT IF EXISTS chk_utilisateurs_code_couleur_conges;

ALTER TABLE utilisateurs
  ADD CONSTRAINT chk_utilisateurs_code_couleur_conges
  CHECK (
    code_couleur_conges IS NULL
    OR code_couleur_conges ~ '^#[0-9a-fA-F]{6}$'
  );

-- 5. Rétro-remplissage : si couleur_conges existe déjà sans code hexa, on le calcule
UPDATE utilisateurs SET code_couleur_conges = CASE couleur_conges
  WHEN 'teal'    THEN '#14b8a6'
  WHEN 'blue'    THEN '#1d4ed8'
  WHEN 'fuchsia' THEN '#d946ef'
  WHEN 'pink'    THEN '#f9a8d4'
  WHEN 'violet'  THEN '#7c3aed'
  WHEN 'orange'  THEN '#f97316'
  WHEN 'gray'    THEN '#6b7280'
  WHEN 'brown'   THEN '#92400e'
END
WHERE couleur_conges IS NOT NULL AND code_couleur_conges IS NULL;
