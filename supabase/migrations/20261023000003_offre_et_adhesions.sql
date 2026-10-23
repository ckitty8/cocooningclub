-- =====================================================
-- Offre du club (formules d'adhésion) et suivi des adhésions
-- =====================================================
-- D'après le bulletin d'adhésion de l'association :
--   * des formules configurables par les administrateurs (nom, prix, durée en
--     mois, espaces inclus, lien HelloAsso, modes de règlement) ;
--   * des adhésions : formule choisie, mode de règlement, cotisation reçue le,
--     date de validation, valable jusqu'au, numéro d'adhérente ;
--   * la validation d'une adhésion fait passer une personne `inscrit` en `membre`
--     (fonction valider_adhesion) ; à l'échéance elle redevient `inscrit`
--     (fonction expirer_adhesions).
--
-- Le bulletin d'adhésion (engagement, WhatsApp, autorisation photo et vidéo) est
-- enregistré UNE SEULE FOIS, sur l'adhésion. Les coordonnées restent sur la fiche
-- de la personne (utilisateurs) et les inscriptions aux ateliers pointent vers elle :
-- le consentement photo d'une personne s'obtient par relation
-- (inscriptions -> utilisateurs -> adhesions), jamais par recopie. La vue
-- vue_autorisation_image donne le dernier bulletin de chaque personne.
--
-- Les droits d'accès par adhésion sont gérés côté site. Les membres existants
-- (rôle `membre` sans adhésion enregistrée) ne sont JAMAIS rétrogradés : seule
-- une personne qui a eu une adhésion active, aujourd'hui entièrement échue,
-- repasse `inscrit`.
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ─────────────────────────────────────────────
-- 0. Coordonnées du bulletin absentes de la fiche (facultatives)
-- ─────────────────────────────────────────────
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS commune  TEXT CHECK (commune  IS NULL OR length(commune)  <= 100),
  ADD COLUMN IF NOT EXISTS activite TEXT CHECK (activite IS NULL OR length(activite) <= 150);

-- ─────────────────────────────────────────────
-- 1. Formules
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.formules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             TEXT NOT NULL CHECK (length(btrim(nom)) BETWEEN 1 AND 80),
  description     TEXT CHECK (description IS NULL OR length(description) <= 500),
  couleur         TEXT NOT NULL DEFAULT 'terracotta'
                    CHECK (couleur IN ('mauve', 'sauge', 'terracotta', 'rose', 'bleu', 'ocre')),
  prix            NUMERIC(8,2) NOT NULL CHECK (prix >= 0),
  duree_mois      INTEGER NOT NULL DEFAULT 12 CHECK (duree_mois BETWEEN 1 AND 60),
  lien_helloasso  TEXT CHECK (lien_helloasso IS NULL OR lien_helloasso ~* '^https://'),
  modes_reglement TEXT[] NOT NULL DEFAULT ARRAY['en_ligne', 'virement', 'especes']
                    CHECK (modes_reglement <@ ARRAY['en_ligne', 'virement', 'especes']),
  est_active      BOOLEAN NOT NULL DEFAULT TRUE,
  ordre           INTEGER NOT NULL DEFAULT 0,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.formule_espaces (
  formule_id UUID NOT NULL REFERENCES public.formules(id) ON DELETE CASCADE,
  antenne_id UUID NOT NULL REFERENCES public.antennes(id) ON DELETE CASCADE,
  PRIMARY KEY (formule_id, antenne_id)
);

DROP TRIGGER IF EXISTS trg_formules_modifie_le ON public.formules;
CREATE TRIGGER trg_formules_modifie_le
  BEFORE UPDATE ON public.formules
  FOR EACH ROW EXECUTE FUNCTION public.maj_modifie_le();

-- ─────────────────────────────────────────────
-- 2. Adhésions
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.adhesions_numero_seq START 1;

CREATE TABLE IF NOT EXISTS public.adhesions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             INTEGER NOT NULL UNIQUE DEFAULT nextval('public.adhesions_numero_seq'),
  utilisateur_id     UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  formule_id         UUID NOT NULL REFERENCES public.formules(id) ON DELETE RESTRICT,
  statut             TEXT NOT NULL DEFAULT 'en_attente'
                       CHECK (statut IN ('en_attente', 'active', 'refusee')),
  mode_reglement     TEXT NOT NULL DEFAULT 'virement'
                       CHECK (mode_reglement IN ('en_ligne', 'virement', 'especes')),
  montant            NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
  cotisation_recue_le DATE,
  date_validation    DATE,
  valable_jusqu_au   DATE,
  -- Bulletin : engagement (statuts et règlement intérieur), WhatsApp, autorisation photo et vidéo.
  engagement_accepte_le DATE,
  whatsapp           BOOLEAN NOT NULL DEFAULT FALSE,
  autorisation_image BOOLEAN NOT NULL DEFAULT FALSE,
  image_supports     TEXT[] NOT NULL DEFAULT '{}'
                       CHECK (image_supports <@ ARRAY['reseaux', 'site', 'imprimes', 'interne']),
  image_signee_le    DATE,
  cree_le            TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (statut <> 'active' OR (date_validation IS NOT NULL AND valable_jusqu_au IS NOT NULL)),
  CHECK (NOT autorisation_image OR image_signee_le IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_adhesions_utilisateur ON public.adhesions(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_adhesions_formule     ON public.adhesions(formule_id);
CREATE INDEX IF NOT EXISTS idx_adhesions_statut      ON public.adhesions(statut, valable_jusqu_au);

DROP TRIGGER IF EXISTS trg_adhesions_modifie_le ON public.adhesions;
CREATE TRIGGER trg_adhesions_modifie_le
  BEFORE UPDATE ON public.adhesions
  FOR EACH ROW EXECUTE FUNCTION public.maj_modifie_le();

-- Le montant est celui de la formule au moment de la demande (jamais saisi par le client).
CREATE OR REPLACE FUNCTION private.fixer_montant_adhesion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  SELECT prix INTO NEW.montant FROM public.formules WHERE id = NEW.formule_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adhesions_montant ON public.adhesions;
CREATE TRIGGER trg_adhesions_montant
  BEFORE INSERT ON public.adhesions
  FOR EACH ROW EXECUTE FUNCTION private.fixer_montant_adhesion();

-- ─────────────────────────────────────────────
-- 3. Droits d'accès (RLS)
-- ─────────────────────────────────────────────
ALTER TABLE public.formules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formule_espaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adhesions       ENABLE ROW LEVEL SECURITY;

-- Formules : les tarifs actifs sont publics (page d'adhésion), tout est modifiable par les admins.
DROP POLICY IF EXISTS formules_lecture_publique ON public.formules;
CREATE POLICY formules_lecture_publique ON public.formules
  FOR SELECT TO anon, authenticated USING (est_active);

-- Une adhérente garde accès à la formule de ses adhésions, même si elle n'est plus proposée.
DROP POLICY IF EXISTS formules_lecture_adherente ON public.formules;
CREATE POLICY formules_lecture_adherente ON public.formules
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.adhesions a
                  WHERE a.formule_id = formules.id AND a.utilisateur_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS formules_admin ON public.formules;
CREATE POLICY formules_admin ON public.formules
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

DROP POLICY IF EXISTS formule_espaces_lecture_publique ON public.formule_espaces;
CREATE POLICY formule_espaces_lecture_publique ON public.formule_espaces
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS formule_espaces_admin ON public.formule_espaces;
CREATE POLICY formule_espaces_admin ON public.formule_espaces
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

-- Adhésions : chacune voit les siennes, les admins gèrent tout.
DROP POLICY IF EXISTS adhesions_lecture_soi ON public.adhesions;
CREATE POLICY adhesions_lecture_soi ON public.adhesions
  FOR SELECT TO authenticated USING (utilisateur_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS adhesions_admin ON public.adhesions;
CREATE POLICY adhesions_admin ON public.adhesions
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

GRANT SELECT ON public.formules, public.formule_espaces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.formules, public.formule_espaces, public.adhesions TO authenticated;
GRANT USAGE ON SEQUENCE public.adhesions_numero_seq TO authenticated;

-- ─────────────────────────────────────────────
-- 3 bis. Autorisation photo et vidéo en vigueur, par personne
-- ─────────────────────────────────────────────
-- Dernier bulletin non refusé de chaque personne. L'autorisation vaut 3 ans à compter
-- de la signature (bulletin). Vue en security_invoker : les droits de la table
-- adhesions s'appliquent (une adhérente ne voit que la sienne, les admins voient tout).
CREATE OR REPLACE VIEW public.vue_autorisation_image
WITH (security_invoker = true) AS
SELECT DISTINCT ON (a.utilisateur_id)
  a.utilisateur_id,
  a.id AS adhesion_id,
  a.autorisation_image,
  a.image_supports,
  a.image_signee_le,
  (a.image_signee_le + INTERVAL '3 years')::DATE AS image_valable_jusqu_au,
  (a.autorisation_image
     AND a.image_signee_le IS NOT NULL
     AND (a.image_signee_le + INTERVAL '3 years')::DATE >= CURRENT_DATE) AS image_valide
FROM public.adhesions a
WHERE a.statut <> 'refusee'
ORDER BY a.utilisateur_id, a.cree_le DESC;

GRANT SELECT ON public.vue_autorisation_image TO authenticated;

-- ─────────────────────────────────────────────
-- 4. Validation d'une adhésion (réservée aux admins)
-- ─────────────────────────────────────────────
-- Fixe les dates (valable_jusqu_au = validation + durée de la formule), passe la
-- personne de `inscrit` à `membre` et reporte les dates sur son profil.
CREATE OR REPLACE FUNCTION public.valider_adhesion(
  p_id         UUID,
  p_mode       TEXT,
  p_recue_le   DATE DEFAULT NULL,
  p_validation DATE DEFAULT NULL
)
RETURNS public.adhesions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_adhesion public.adhesions;
  v_duree    INTEGER;
  v_debut    DATE := COALESCE(p_validation, CURRENT_DATE);
  v_fin      DATE;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_mode NOT IN ('en_ligne', 'virement', 'especes') THEN
    RAISE EXCEPTION 'Mode de règlement inconnu' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_adhesion FROM public.adhesions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adhésion introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_adhesion.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Cette adhésion a déjà été traitée' USING ERRCODE = '22023';
  END IF;
  SELECT duree_mois INTO v_duree FROM public.formules WHERE id = v_adhesion.formule_id;

  v_fin := (v_debut + make_interval(months => v_duree))::DATE;

  UPDATE public.adhesions
     SET statut = 'active', mode_reglement = p_mode, cotisation_recue_le = p_recue_le,
         date_validation = v_debut, valable_jusqu_au = v_fin
   WHERE id = p_id
   RETURNING * INTO v_adhesion;

  -- SECURITY DEFINER : le déclencheur qui protège le rôle ne bloque pas cette mise à jour.
  UPDATE public.utilisateurs
     SET role = CASE WHEN role = 'inscrit' THEN 'membre'::role_utilisateur ELSE role END,
         debut_abonnement = v_debut,
         fin_abonnement = v_fin
   WHERE id = v_adhesion.utilisateur_id
     AND role <> 'administrateur';

  RETURN v_adhesion;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.valider_adhesion(UUID, TEXT, DATE, DATE) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.valider_adhesion(UUID, TEXT, DATE, DATE) TO authenticated;

-- ─────────────────────────────────────────────
-- 5. Échéance : une adhésion échue ramène la personne à `inscrit`
-- ─────────────────────────────────────────────
-- Appelée depuis l'écran « Offre & adhésions ». Ne touche que les comptes `membre`
-- qui ont eu au moins une adhésion active et n'en ont plus aucune en cours.
CREATE OR REPLACE FUNCTION public.expirer_adhesions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_nb INTEGER;
BEGIN
  IF NOT private.utilisateur_est_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs' USING ERRCODE = '42501';
  END IF;

  UPDATE public.utilisateurs u
     SET role = 'inscrit'
   WHERE u.role = 'membre'
     AND EXISTS (SELECT 1 FROM public.adhesions a
                  WHERE a.utilisateur_id = u.id AND a.statut = 'active')
     AND NOT EXISTS (SELECT 1 FROM public.adhesions a
                      WHERE a.utilisateur_id = u.id AND a.statut = 'active'
                        AND a.valable_jusqu_au >= CURRENT_DATE);
  GET DIAGNOSTICS v_nb = ROW_COUNT;
  RETURN v_nb;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expirer_adhesions() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.expirer_adhesions() TO authenticated;

-- ─────────────────────────────────────────────
-- 6. Les trois formules du bulletin d'adhésion (une seule fois)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  v_business UUID;
  v_creatif  UUID;
  v_complet  UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.formules) THEN
    RETURN;
  END IF;

  INSERT INTO public.formules (nom, description, couleur, prix, ordre) VALUES
    ('Cocooning Business', 'Coworking, entraide et projets qui avancent.', 'mauve', 100, 1)
    RETURNING id INTO v_business;
  INSERT INTO public.formules (nom, description, couleur, prix, ordre) VALUES
    ('Cocooning Créatif', 'Ateliers créatifs, rencontres et moments de partage.', 'sauge', 80, 2)
    RETURNING id INTO v_creatif;
  INSERT INTO public.formules (nom, description, couleur, prix, ordre) VALUES
    ('Cocooning Complet', 'Les deux univers réunis dans une seule adhésion.', 'terracotta', 150, 3)
    RETURNING id INTO v_complet;

  INSERT INTO public.formule_espaces (formule_id, antenne_id)
    SELECT v_business, id FROM public.antennes WHERE slug = 'business';
  INSERT INTO public.formule_espaces (formule_id, antenne_id)
    SELECT v_creatif, id FROM public.antennes WHERE slug = 'creatifs';
  INSERT INTO public.formule_espaces (formule_id, antenne_id)
    SELECT v_complet, id FROM public.antennes WHERE slug IN ('business', 'creatifs');
END;
$$;
