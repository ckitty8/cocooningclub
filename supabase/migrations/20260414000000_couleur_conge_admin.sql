-- =====================================================
-- Couleur personnelle des congés par admin
-- =====================================================
-- Chaque admin peut choisir une couleur (parmi 10) pour
-- afficher ses congés dans le calendrier récap.
-- Contrainte : une couleur ne peut être utilisée que par 1 admin.
-- =====================================================

-- 1. Ajouter la colonne couleur_conge sur utilisateurs
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS couleur_conge VARCHAR(20);

COMMENT ON COLUMN utilisateurs.couleur_conge IS
  'Clé de couleur (teal, blue, fuchsia, pink, violet, orange, gray, brown) affichée sur le calendrier pour les congés de cet admin. NULL = non choisie.';

-- 2. Contrainte : une couleur ne peut être utilisée que par 1 utilisateur (UNIQUE partial index pour autoriser plusieurs NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_utilisateurs_couleur_conge
  ON utilisateurs(couleur_conge)
  WHERE couleur_conge IS NOT NULL;

-- 3. Couleurs valides via CHECK
ALTER TABLE utilisateurs
  DROP CONSTRAINT IF EXISTS chk_utilisateurs_couleur_conge;

ALTER TABLE utilisateurs
  ADD CONSTRAINT chk_utilisateurs_couleur_conge
  CHECK (
    couleur_conge IS NULL
    OR couleur_conge IN ('teal', 'blue', 'fuchsia', 'pink', 'violet', 'orange', 'gray', 'brown')
  );
