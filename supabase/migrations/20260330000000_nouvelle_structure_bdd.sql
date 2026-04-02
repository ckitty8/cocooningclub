-- ============================================================
-- COCOONING CLUB — Nouvelle structure de base de données
-- Compatible Supabase (PostgreSQL + Row Level Security)
-- 8 tables, 3 vues, optimisée pour le site réel
-- ============================================================
--
-- STRUCTURE :
--   1. utilisateurs         → Comptes + 4 profils
--   2. formateurs           → Animateurs internes ou externes
--   3. categories           → Types d'activités (papotage, terrarium…)
--   4. ateliers             → Fiche + date + heure (tout en un)
--   5. inscriptions         → Qui vient à quel atelier (avec ou sans compte)
--   6. avis                 → Témoignages modérés
--   7. transactions_paypal  → Preuves de paiement
--   8. logs                 → Journal de toutes les actions
--
-- ============================================================


-- ============================================================
-- 0. NETTOYAGE — Suppression des anciennes tables/vues
-- ============================================================

DROP VIEW IF EXISTS inscriptions_avec_atelier CASCADE;
DROP VIEW IF EXISTS vue_prochains_ateliers CASCADE;
DROP VIEW IF EXISTS vue_avis_publies CASCADE;
DROP VIEW IF EXISTS vue_suivi_inscriptions CASCADE;

DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS transactions_paypal CASCADE;
DROP TABLE IF EXISTS avis CASCADE;
DROP TABLE IF EXISTS inscriptions CASCADE;
DROP TABLE IF EXISTS ateliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS formateurs CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;

-- Suppression des anciens types enum s'ils existent
DROP TYPE IF EXISTS role_utilisateur CASCADE;
DROP TYPE IF EXISTS niveau_atelier CASCADE;
DROP TYPE IF EXISTS statut_atelier CASCADE;
DROP TYPE IF EXISTS statut_inscription CASCADE;
DROP TYPE IF EXISTS statut_paiement CASCADE;
DROP TYPE IF EXISTS statut_moderation CASCADE;
DROP TYPE IF EXISTS statut_transaction_paypal CASCADE;
DROP TYPE IF EXISTS type_recurrence CASCADE;
DROP TYPE IF EXISTS type_action_log CASCADE;


-- ============================================================
-- 1. TYPES ENUM
-- ============================================================

CREATE TYPE role_utilisateur AS ENUM (
  'administrateur',
  'inscrit',
  'membre_standard',
  'membre_premium'
);

CREATE TYPE niveau_atelier AS ENUM (
  'debutant',
  'intermediaire',
  'avance'
);

CREATE TYPE statut_atelier AS ENUM (
  'brouillon',
  'publie',
  'complet',
  'annule',
  'termine'
);

CREATE TYPE statut_inscription AS ENUM (
  'en_attente',
  'confirme',
  'annule'
);

CREATE TYPE statut_paiement AS ENUM (
  'en_attente',
  'paye',
  'non_requis'
);

CREATE TYPE statut_moderation AS ENUM (
  'en_attente',
  'approuve',
  'rejete'
);

CREATE TYPE statut_transaction_paypal AS ENUM (
  'en_attente',
  'complete',
  'rembourse',
  'echoue'
);

CREATE TYPE type_recurrence AS ENUM (
  'hebdomadaire',
  'bimensuel',
  'mensuel'
);

CREATE TYPE type_action_log AS ENUM (
  'connexion',
  'deconnexion',
  'inscription_atelier',
  'annulation_inscription',
  'paiement_recu',
  'remboursement',
  'avis_soumis',
  'avis_modere',
  'profil_modifie',
  'mot_de_passe_modifie',
  'atelier_cree',
  'atelier_modifie',
  'membre_promu',
  'membre_desactive',
  'export_donnees',
  'autre'
);


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ─────────────────────────────────────────────
-- UTILISATEURS
-- ─────────────────────────────────────────────
CREATE TABLE utilisateurs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe_hash  VARCHAR(255),
  prenom             VARCHAR(100) NOT NULL,
  nom                VARCHAR(100) NOT NULL,
  telephone          VARCHAR(20),
  role               role_utilisateur NOT NULL DEFAULT 'inscrit',
  url_avatar         TEXT,
  debut_abonnement   DATE,
  fin_abonnement     DATE,
  est_actif          BOOLEAN NOT NULL DEFAULT true,
  cree_le            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_le         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN utilisateurs.mot_de_passe_hash IS 'NULL si auth gérée par Supabase Auth';


-- ─────────────────────────────────────────────
-- FORMATEURS
-- ─────────────────────────────────────────────
CREATE TABLE formateurs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom          VARCHAR(100) NOT NULL,
  nom             VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE,
  telephone       VARCHAR(20),
  bio             TEXT,
  specialites     TEXT,
  url_photo       TEXT,
  est_externe     BOOLEAN NOT NULL DEFAULT true,
  utilisateur_id  UUID UNIQUE REFERENCES utilisateurs(id) ON DELETE SET NULL,
  est_actif       BOOLEAN NOT NULL DEFAULT true,
  cree_le         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_le      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN formateurs.utilisateur_id IS 'Lien optionnel vers un compte — NULL si formateur purement externe';
COMMENT ON COLUMN formateurs.specialites IS 'Texte libre pour le site : "macramé, tricot"';


-- ─────────────────────────────────────────────
-- CATEGORIES
-- Types d'activités créatives.
-- Mises à jour pour correspondre aux vrais ateliers.
-- ─────────────────────────────────────────────
CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom              VARCHAR(100) NOT NULL UNIQUE,
  description      TEXT,
  slug             VARCHAR(100) NOT NULL UNIQUE,
  url_icone        VARCHAR(500),
  ordre_affichage  INTEGER NOT NULL DEFAULT 0,
  cree_le          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN categories.slug IS 'Pour les URLs : cocooningclub.fr/ateliers/papotage';


-- ─────────────────────────────────────────────
-- ATELIERS
-- Un atelier = une fiche + une seule date.
-- ─────────────────────────────────────────────
CREATE TABLE ateliers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id       UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  formateur_id       UUID REFERENCES formateurs(id) ON DELETE SET NULL,
  titre              VARCHAR(255) NOT NULL,
  description        TEXT,
  description_courte TEXT,
  niveau             niveau_atelier NOT NULL DEFAULT 'debutant',
  lieu               VARCHAR(255),
  url_image          TEXT,

  -- Planification (un atelier = une date)
  date_atelier       DATE NOT NULL,
  heure_debut        TIME NOT NULL,
  duree              INTERVAL NOT NULL DEFAULT '2 hours',
  places_max         INTEGER NOT NULL DEFAULT 10 CHECK (places_max > 0),
  places_disponibles INTEGER NOT NULL DEFAULT 10 CHECK (places_disponibles >= 0),

  -- Tarification + PayPal
  tarif_standard     DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (tarif_standard >= 0),
  tarif_premium      DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (tarif_premium >= 0),
  tarif_affichage    VARCHAR(100),
  lien_paypal        TEXT,

  -- Statut
  statut             statut_atelier NOT NULL DEFAULT 'brouillon',

  -- Récurrence (optionnel)
  modele_id          UUID REFERENCES ateliers(id) ON DELETE SET NULL,
  recurrence         type_recurrence,

  cree_le            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modifie_le         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE ateliers IS 'Un atelier = une fiche + une date. Pas de table séances séparée.';
COMMENT ON COLUMN ateliers.tarif_affichage IS 'Texte libre pour affichage sur le site : "25€", "Gratuit", "Consommation sur place"';
COMMENT ON COLUMN ateliers.modele_id IS 'NULL = atelier unique. Rempli = copie générée par récurrence.';
COMMENT ON COLUMN ateliers.recurrence IS 'Défini uniquement sur l''atelier modèle.';
COMMENT ON COLUMN ateliers.places_disponibles IS 'Décrémenté à chaque inscription confirmée.';
COMMENT ON COLUMN ateliers.lien_paypal IS 'Lien PayPal.me ou bouton envoyé aux inscrits.';


-- ─────────────────────────────────────────────
-- INSCRIPTIONS
-- Lien entre un participant et un atelier.
-- Supporte l'inscription SANS compte (invité)
-- via nom_invite, prenom_invite, email_invite.
-- ─────────────────────────────────────────────
CREATE TABLE inscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id       UUID NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,

  -- Utilisateur connecté (optionnel)
  utilisateur_id   UUID REFERENCES utilisateurs(id) ON DELETE CASCADE,

  -- Invité sans compte (rempli si utilisateur_id est NULL)
  nom_invite       VARCHAR(100),
  prenom_invite    VARCHAR(100),
  email_invite     VARCHAR(255),

  -- Infos complémentaires
  date_naissance   DATE,

  statut           statut_inscription NOT NULL DEFAULT 'en_attente',
  statut_paiement  statut_paiement NOT NULL DEFAULT 'en_attente',
  present          BOOLEAN NOT NULL DEFAULT false,
  inscrit_le       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  annule_le        TIMESTAMP WITH TIME ZONE,

  -- Contrainte : soit utilisateur_id, soit les champs invité
  CONSTRAINT chk_participant CHECK (
    utilisateur_id IS NOT NULL
    OR (nom_invite IS NOT NULL AND prenom_invite IS NOT NULL AND email_invite IS NOT NULL)
  )
);

COMMENT ON COLUMN inscriptions.utilisateur_id IS 'NULL si inscription en tant qu''invité (sans compte).';
COMMENT ON COLUMN inscriptions.nom_invite IS 'Nom de l''invité — rempli uniquement si pas de compte.';
COMMENT ON COLUMN inscriptions.prenom_invite IS 'Prénom de l''invité — rempli uniquement si pas de compte.';
COMMENT ON COLUMN inscriptions.email_invite IS 'Email de l''invité — rempli uniquement si pas de compte.';
COMMENT ON COLUMN inscriptions.date_naissance IS 'Requis pour certains ateliers (ex: Pierre & Oracle).';
COMMENT ON COLUMN inscriptions.present IS 'Coché par l''admin après l''atelier → déverrouille le droit de laisser un avis.';


-- ─────────────────────────────────────────────
-- AVIS
-- ─────────────────────────────────────────────
CREATE TABLE avis (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id   UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  inscription_id   UUID NOT NULL UNIQUE REFERENCES inscriptions(id) ON DELETE CASCADE,
  note             INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire      TEXT,
  moderation       statut_moderation NOT NULL DEFAULT 'en_attente',
  mis_en_avant     BOOLEAN NOT NULL DEFAULT false,
  cree_le          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modere_le        TIMESTAMP WITH TIME ZONE
);

COMMENT ON COLUMN avis.inscription_id IS 'UNIQUE : un seul avis par participation.';
COMMENT ON COLUMN avis.mis_en_avant IS 'Sélectionné par l''admin pour la page d''accueil.';


-- ─────────────────────────────────────────────
-- TRANSACTIONS PAYPAL
-- ─────────────────────────────────────────────
CREATE TABLE transactions_paypal (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id         UUID NOT NULL UNIQUE REFERENCES inscriptions(id) ON DELETE CASCADE,
  paypal_transaction_id  VARCHAR(100) NOT NULL UNIQUE,
  montant                DECIMAL(8,2) NOT NULL CHECK (montant >= 0),
  devise                 VARCHAR(3) NOT NULL DEFAULT 'EUR',
  email_payeur           VARCHAR(255),
  statut                 statut_transaction_paypal NOT NULL DEFAULT 'en_attente',
  donnees_brutes         JSONB,
  paypal_cree_le         TIMESTAMP WITH TIME ZONE,
  enregistre_le          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN transactions_paypal.donnees_brutes IS 'Réponse JSON complète de PayPal — preuve en cas de litige.';


-- ─────────────────────────────────────────────
-- LOGS
-- ─────────────────────────────────────────────
CREATE TABLE logs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id           UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  action                   type_action_log NOT NULL,
  table_cible              VARCHAR(100),
  enregistrement_cible_id  UUID,
  details                  JSONB,
  adresse_ip               VARCHAR(45),
  user_agent               VARCHAR(500),
  horodatage               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN logs.details IS 'JSON libre — ex: {"champ":"email","ancien":"a@b.com","nouveau":"c@d.com"}';


-- ============================================================
-- 3. INDEX
-- ============================================================

-- Utilisateurs
CREATE INDEX idx_utilisateurs_role ON utilisateurs(role);
CREATE INDEX idx_utilisateurs_est_actif ON utilisateurs(est_actif);
CREATE INDEX idx_utilisateurs_fin_abonnement ON utilisateurs(fin_abonnement);

-- Formateurs
CREATE INDEX idx_formateurs_est_actif ON formateurs(est_actif) WHERE est_actif = true;
CREATE INDEX idx_formateurs_est_externe ON formateurs(est_externe);

-- Categories
CREATE INDEX idx_categories_ordre ON categories(ordre_affichage);

-- Ateliers
CREATE INDEX idx_ateliers_categorie ON ateliers(categorie_id);
CREATE INDEX idx_ateliers_formateur ON ateliers(formateur_id);
CREATE INDEX idx_ateliers_statut ON ateliers(statut);
CREATE INDEX idx_ateliers_date ON ateliers(date_atelier);
CREATE INDEX idx_ateliers_niveau ON ateliers(niveau);
CREATE INDEX idx_ateliers_modele ON ateliers(modele_id) WHERE modele_id IS NOT NULL;
CREATE INDEX idx_ateliers_publie_date ON ateliers(date_atelier)
  WHERE statut = 'publie';

-- Inscriptions
CREATE INDEX idx_inscriptions_utilisateur ON inscriptions(utilisateur_id);
CREATE INDEX idx_inscriptions_atelier ON inscriptions(atelier_id);
CREATE INDEX idx_inscriptions_statut ON inscriptions(statut);
CREATE INDEX idx_inscriptions_paiement ON inscriptions(statut_paiement);
CREATE INDEX idx_inscriptions_email_invite ON inscriptions(email_invite);

-- Avis
CREATE INDEX idx_avis_utilisateur ON avis(utilisateur_id);
CREATE INDEX idx_avis_moderation ON avis(moderation);
CREATE INDEX idx_avis_mis_en_avant ON avis(mis_en_avant) WHERE mis_en_avant = true;

-- Transactions PayPal
CREATE INDEX idx_transactions_statut ON transactions_paypal(statut);
CREATE INDEX idx_transactions_date ON transactions_paypal(enregistre_le);

-- Logs
CREATE INDEX idx_logs_utilisateur ON logs(utilisateur_id);
CREATE INDEX idx_logs_action ON logs(action);
CREATE INDEX idx_logs_horodatage ON logs(horodatage);
CREATE INDEX idx_logs_table_cible ON logs(table_cible, enregistrement_cible_id);


-- ============================================================
-- 4. TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION maj_modifie_le()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modifie_le = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_utilisateurs_modifie_le
  BEFORE UPDATE ON utilisateurs
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

CREATE TRIGGER trg_ateliers_modifie_le
  BEFORE UPDATE ON ateliers
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();

CREATE TRIGGER trg_formateurs_modifie_le
  BEFORE UPDATE ON formateurs
  FOR EACH ROW EXECUTE FUNCTION maj_modifie_le();


-- Trigger pour décrémenter les places disponibles
CREATE OR REPLACE FUNCTION decrementer_places()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'confirme' AND (OLD IS NULL OR OLD.statut != 'confirme') THEN
    UPDATE ateliers
    SET places_disponibles = places_disponibles - 1
    WHERE id = NEW.atelier_id AND places_disponibles > 0;
  END IF;

  IF OLD IS NOT NULL AND OLD.statut = 'confirme' AND NEW.statut = 'annule' THEN
    UPDATE ateliers
    SET places_disponibles = places_disponibles + 1
    WHERE id = NEW.atelier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inscription_places
  AFTER INSERT OR UPDATE ON inscriptions
  FOR EACH ROW EXECUTE FUNCTION decrementer_places();


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE formateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ateliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_paypal ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- UTILISATEURS
CREATE POLICY "utilisateurs_voir_soi"
  ON utilisateurs FOR SELECT USING (auth.uid() = id);

CREATE POLICY "utilisateurs_admin_tout"
  ON utilisateurs FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

CREATE POLICY "utilisateurs_modifier_soi"
  ON utilisateurs FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- FORMATEURS (publics en lecture, admin en écriture)
CREATE POLICY "formateurs_lecture"
  ON formateurs FOR SELECT USING (est_actif = true);

CREATE POLICY "formateurs_admin"
  ON formateurs FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- CATEGORIES (publiques en lecture)
CREATE POLICY "categories_lecture"
  ON categories FOR SELECT USING (true);

CREATE POLICY "categories_admin"
  ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- ATELIERS (publiés = publics)
CREATE POLICY "ateliers_lecture_publies"
  ON ateliers FOR SELECT USING (statut IN ('publie', 'complet', 'termine'));

CREATE POLICY "ateliers_admin"
  ON ateliers FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- INSCRIPTIONS
-- Lecture : ses propres inscriptions (connecté) ou admin
CREATE POLICY "inscriptions_voir_siennes"
  ON inscriptions FOR SELECT USING (auth.uid() = utilisateur_id);

-- Insertion : tout le monde peut s'inscrire (invités inclus)
CREATE POLICY "inscriptions_creer_invite"
  ON inscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "inscriptions_admin"
  ON inscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- AVIS (approuvés = publics)
CREATE POLICY "avis_lecture_approuves"
  ON avis FOR SELECT USING (moderation = 'approuve');

CREATE POLICY "avis_creer"
  ON avis FOR INSERT WITH CHECK (auth.uid() = utilisateur_id);

CREATE POLICY "avis_admin"
  ON avis FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- TRANSACTIONS PAYPAL
CREATE POLICY "transactions_voir_siennes"
  ON transactions_paypal FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM inscriptions i
    WHERE i.id = transactions_paypal.inscription_id AND i.utilisateur_id = auth.uid()
  ));

CREATE POLICY "transactions_admin"
  ON transactions_paypal FOR ALL
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

-- LOGS (admin seul)
CREATE POLICY "logs_admin_lecture"
  ON logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM utilisateurs u WHERE u.id = auth.uid() AND u.role = 'administrateur'));

CREATE POLICY "logs_insertion"
  ON logs FOR INSERT WITH CHECK (true);


-- ============================================================
-- 6. VUES UTILES
-- ============================================================

-- Prochains ateliers (page calendrier + accueil)
CREATE VIEW vue_prochains_ateliers AS
SELECT
  a.id,
  a.titre,
  a.description,
  a.description_courte,
  c.nom AS categorie,
  c.slug AS categorie_slug,
  a.niveau,
  a.lieu,
  a.date_atelier,
  a.heure_debut,
  a.duree,
  a.places_disponibles,
  a.places_max,
  a.tarif_standard,
  a.tarif_premium,
  a.tarif_affichage,
  a.url_image,
  a.statut,
  f.prenom AS formateur_prenom,
  f.nom AS formateur_nom,
  f.url_photo AS formateur_photo
FROM ateliers a
JOIN categories c ON a.categorie_id = c.id
LEFT JOIN formateurs f ON a.formateur_id = f.id
WHERE a.statut IN ('publie', 'complet')
  AND a.date_atelier >= CURRENT_DATE
ORDER BY a.date_atelier ASC, a.heure_debut ASC;


-- Avis publiés (page témoignages + accueil)
CREATE VIEW vue_avis_publies AS
SELECT
  av.id AS avis_id,
  av.note,
  av.commentaire,
  av.mis_en_avant,
  av.cree_le,
  u.prenom,
  u.url_avatar,
  a.titre AS atelier_titre,
  c.nom AS categorie
FROM avis av
JOIN utilisateurs u ON av.utilisateur_id = u.id
JOIN inscriptions i ON av.inscription_id = i.id
JOIN ateliers a ON i.atelier_id = a.id
JOIN categories c ON a.categorie_id = c.id
WHERE av.moderation = 'approuve'
ORDER BY av.mis_en_avant DESC, av.cree_le DESC;


-- Suivi inscriptions (tableau de bord admin)
CREATE VIEW vue_suivi_inscriptions AS
SELECT
  COALESCE(u.prenom, i.prenom_invite) AS prenom,
  COALESCE(u.nom, i.nom_invite) AS nom,
  COALESCE(u.email, i.email_invite) AS email,
  u.role,
  a.titre AS atelier_titre,
  a.date_atelier,
  i.statut AS statut_inscription,
  i.statut_paiement,
  i.present,
  i.date_naissance,
  tp.montant,
  tp.paypal_transaction_id,
  tp.statut AS statut_paypal,
  i.inscrit_le
FROM inscriptions i
LEFT JOIN utilisateurs u ON i.utilisateur_id = u.id
LEFT JOIN ateliers a ON i.atelier_id = a.id
LEFT JOIN transactions_paypal tp ON i.id = tp.inscription_id
ORDER BY a.date_atelier DESC, i.inscrit_le DESC;


-- ============================================================
-- 7. DONNEES INITIALES — Catégories réelles du site
-- ============================================================

INSERT INTO categories (nom, description, slug, ordre_affichage) VALUES
  ('Papotage',        'Moment d''échange entre entrepreneuses autour d''un thé ou café',   'papotage',        1),
  ('Terrarium',       'Créez votre propre mini-jardin sous verre',                          'terrarium',       2),
  ('Pierre & Oracle', 'Activité créative autour du thème Pierre et Oracle',                 'pierre-oracle',   3),
  ('Bougie',          'Confectionnez vos propres bougies artisanales',                      'bougie',          4),
  ('Macramé',         'L''art des noeuds décoratifs',                                       'macrame',         5),
  ('Aquarelle',       'Initiation à la peinture aquarelle',                                 'aquarelle',       6),
  ('Céramique',       'Modelage et création en céramique',                                  'ceramique',       7),
  ('Tricot',          'Apprenez à tricoter des pièces uniques',                             'tricot',          8),
  ('Crochet',         'Techniques de crochet pour tous niveaux',                            'crochet',         9),
  ('Couture',         'Créez vos propres vêtements et accessoires',                         'couture',        10),
  ('Broderie',        'Décorez vos tissus avec des motifs brodés',                          'broderie',       11),
  ('Punch needle',    'Broderie en relief avec l''aiguille magique',                        'punch-needle',   12);


-- ============================================================
-- 8. ACTIVER REALTIME sur ateliers
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ateliers;


-- ============================================================
-- FIN — 8 tables, 3 vues, RLS activé, catégories réelles
-- ============================================================
