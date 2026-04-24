-- =====================================================
-- Espace Disponibilités Admin
-- =====================================================
-- 4 tables :
--   - disponibilites      : créneaux récurrents par admin
--   - indisponibilites    : congés ponctuels par admin
--   - jours_feries        : jours fériés France (partagé)
--   - vacances_scolaires  : vacances scolaires Zone C (partagé)
-- =====================================================

-- 1. DISPONIBILITES (créneaux récurrents)
CREATE TABLE IF NOT EXISTS disponibilites (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  jour_semaine   SMALLINT NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),  -- 0=dimanche, 1=lundi, ..., 6=samedi
  heure_debut    TIME NOT NULL,
  heure_fin      TIME NOT NULL,
  cree_le        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (heure_debut < heure_fin)
);

CREATE INDEX IF NOT EXISTS idx_disponibilites_utilisateur ON disponibilites(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_disponibilites_jour ON disponibilites(jour_semaine);

-- 2. INDISPONIBILITES (congés ponctuels)
CREATE TABLE IF NOT EXISTS indisponibilites (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  date_debut     DATE NOT NULL,
  date_fin       DATE NOT NULL,
  motif          TEXT,
  cree_le        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (date_debut <= date_fin)
);

CREATE INDEX IF NOT EXISTS idx_indisponibilites_utilisateur ON indisponibilites(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_indisponibilites_dates ON indisponibilites(date_debut, date_fin);

-- 3. JOURS FERIES (partagé, lecture seule pour admins)
CREATE TABLE IF NOT EXISTS jours_feries (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date   DATE NOT NULL UNIQUE,
  nom    VARCHAR(100) NOT NULL,
  annee  INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jours_feries_annee ON jours_feries(annee);

-- 4. VACANCES SCOLAIRES ZONE C (partagé)
CREATE TABLE IF NOT EXISTS vacances_scolaires (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             VARCHAR(100) NOT NULL,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  annee_scolaire  VARCHAR(15) NOT NULL,  -- ex: "2025-2026"
  zone            VARCHAR(10) NOT NULL DEFAULT 'C',
  CHECK (date_debut <= date_fin)
);

CREATE INDEX IF NOT EXISTS idx_vacances_dates ON vacances_scolaires(date_debut, date_fin);

-- =====================================================
-- SEED JOURS FERIES (2025-2028)
-- =====================================================
INSERT INTO jours_feries (date, nom, annee) VALUES
  -- 2025
  ('2025-01-01', 'Jour de l''An', 2025),
  ('2025-04-21', 'Lundi de Pâques', 2025),
  ('2025-05-01', 'Fête du Travail', 2025),
  ('2025-05-08', 'Victoire 1945', 2025),
  ('2025-05-29', 'Ascension', 2025),
  ('2025-06-09', 'Lundi de Pentecôte', 2025),
  ('2025-07-14', 'Fête Nationale', 2025),
  ('2025-08-15', 'Assomption', 2025),
  ('2025-11-01', 'Toussaint', 2025),
  ('2025-11-11', 'Armistice 1918', 2025),
  ('2025-12-25', 'Noël', 2025),
  -- 2026
  ('2026-01-01', 'Jour de l''An', 2026),
  ('2026-04-06', 'Lundi de Pâques', 2026),
  ('2026-05-01', 'Fête du Travail', 2026),
  ('2026-05-08', 'Victoire 1945', 2026),
  ('2026-05-14', 'Ascension', 2026),
  ('2026-05-25', 'Lundi de Pentecôte', 2026),
  ('2026-07-14', 'Fête Nationale', 2026),
  ('2026-08-15', 'Assomption', 2026),
  ('2026-11-01', 'Toussaint', 2026),
  ('2026-11-11', 'Armistice 1918', 2026),
  ('2026-12-25', 'Noël', 2026),
  -- 2027
  ('2027-01-01', 'Jour de l''An', 2027),
  ('2027-03-29', 'Lundi de Pâques', 2027),
  ('2027-05-01', 'Fête du Travail', 2027),
  ('2027-05-06', 'Ascension', 2027),
  ('2027-05-08', 'Victoire 1945', 2027),
  ('2027-05-17', 'Lundi de Pentecôte', 2027),
  ('2027-07-14', 'Fête Nationale', 2027),
  ('2027-08-15', 'Assomption', 2027),
  ('2027-11-01', 'Toussaint', 2027),
  ('2027-11-11', 'Armistice 1918', 2027),
  ('2027-12-25', 'Noël', 2027),
  -- 2028
  ('2028-01-01', 'Jour de l''An', 2028),
  ('2028-04-17', 'Lundi de Pâques', 2028),
  ('2028-05-01', 'Fête du Travail', 2028),
  ('2028-05-08', 'Victoire 1945', 2028),
  ('2028-05-25', 'Ascension', 2028),
  ('2028-06-05', 'Lundi de Pentecôte', 2028),
  ('2028-07-14', 'Fête Nationale', 2028),
  ('2028-08-15', 'Assomption', 2028),
  ('2028-11-01', 'Toussaint', 2028),
  ('2028-11-11', 'Armistice 1918', 2028),
  ('2028-12-25', 'Noël', 2028)
ON CONFLICT (date) DO NOTHING;

-- =====================================================
-- SEED VACANCES SCOLAIRES ZONE C (Paris, Créteil, Versailles, Montpellier, Toulouse)
-- Dates officielles Éducation Nationale
-- =====================================================
INSERT INTO vacances_scolaires (nom, date_debut, date_fin, annee_scolaire, zone) VALUES
  -- 2025-2026
  ('Toussaint',  '2025-10-18', '2025-11-03', '2025-2026', 'C'),
  ('Noël',       '2025-12-20', '2026-01-05', '2025-2026', 'C'),
  ('Hiver',      '2026-02-07', '2026-02-23', '2025-2026', 'C'),
  ('Printemps',  '2026-04-04', '2026-04-20', '2025-2026', 'C'),
  ('Été',        '2026-07-04', '2026-08-31', '2025-2026', 'C'),
  -- 2026-2027
  ('Toussaint',  '2026-10-17', '2026-11-02', '2026-2027', 'C'),
  ('Noël',       '2026-12-19', '2027-01-04', '2026-2027', 'C'),
  ('Hiver',      '2027-02-06', '2027-02-22', '2026-2027', 'C'),
  ('Printemps',  '2027-04-03', '2027-04-19', '2026-2027', 'C'),
  ('Été',        '2027-07-03', '2027-08-31', '2026-2027', 'C'),
  -- 2027-2028
  ('Toussaint',  '2027-10-16', '2027-11-02', '2027-2028', 'C'),
  ('Noël',       '2027-12-18', '2028-01-03', '2027-2028', 'C'),
  ('Hiver',      '2028-02-05', '2028-02-21', '2027-2028', 'C'),
  ('Printemps',  '2028-04-01', '2028-04-17', '2027-2028', 'C'),
  ('Été',        '2028-07-01', '2028-08-31', '2027-2028', 'C')
ON CONFLICT DO NOTHING;

-- =====================================================
-- FONCTION : vérifier si au moins un admin est dispo à une date donnée
-- =====================================================
CREATE OR REPLACE FUNCTION admin_dispo_le(p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_jour_semaine SMALLINT;
BEGIN
  -- EXTRACT(DOW) renvoie 0=dimanche, 1=lundi, ..., 6=samedi (compatible avec notre convention)
  v_jour_semaine := EXTRACT(DOW FROM p_date)::SMALLINT;

  RETURN EXISTS (
    SELECT 1
    FROM utilisateurs u
    WHERE u.role = 'administrateur'
      AND EXISTS (
        SELECT 1 FROM disponibilites d
        WHERE d.utilisateur_id = u.id
          AND d.jour_semaine = v_jour_semaine
      )
      AND NOT EXISTS (
        SELECT 1 FROM indisponibilites i
        WHERE i.utilisateur_id = u.id
          AND p_date BETWEEN i.date_debut AND i.date_fin
      )
  );
END;
$$;

COMMENT ON FUNCTION admin_dispo_le(DATE) IS
  'Retourne TRUE si au moins un administrateur a une disponibilité récurrente sur ce jour de semaine ET n''est pas en congés à cette date.';

GRANT EXECUTE ON FUNCTION admin_dispo_le(DATE) TO authenticated;

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE disponibilites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE indisponibilites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE jours_feries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacances_scolaires ENABLE ROW LEVEL SECURITY;

-- DISPONIBILITES : admin peut tout voir/gérer, chaque user ne voit que les siennes
DROP POLICY IF EXISTS "disponibilites_admin_all" ON disponibilites;
CREATE POLICY "disponibilites_admin_all"
  ON disponibilites FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- INDISPONIBILITES : idem
DROP POLICY IF EXISTS "indisponibilites_admin_all" ON indisponibilites;
CREATE POLICY "indisponibilites_admin_all"
  ON indisponibilites FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'))
  WITH CHECK (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- JOURS FERIES : lecture par tout admin connecté
DROP POLICY IF EXISTS "jours_feries_lecture_admin" ON jours_feries;
CREATE POLICY "jours_feries_lecture_admin"
  ON jours_feries FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- VACANCES SCOLAIRES : lecture par tout admin connecté
DROP POLICY IF EXISTS "vacances_scolaires_lecture_admin" ON vacances_scolaires;
CREATE POLICY "vacances_scolaires_lecture_admin"
  ON vacances_scolaires FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));
