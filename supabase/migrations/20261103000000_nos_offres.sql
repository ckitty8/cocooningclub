-- Page « Nos offres » (03/11) : contenu des cartes d'offre et questions « Bon à savoir », modifiables par les admins.
--
-- 1. Colonnes ajoutées aux formules (toutes facultatives ou avec une valeur par défaut : l'ancien code les ignore) :
--    rythme        « 1 café et 1 atelier par mois »
--    prix_barre    prix barré affiché à côté du prix (« au lieu de 180 € »)
--    mise_en_avant carte mise en avant (« Le plus complet »)
--    activites     liste [{ "nom", "lieu", "espace" }] affichée en haut de la carte (espace : papotages, creatifs, business)
--    compris       liste « Ce qui est compris », une ligne par point
-- 2. Table bon_a_savoir : questions / réponses en bas de la page, lisibles par le public une fois publiées.
-- 3. Les trois formules du bulletin reçoivent les noms et le contenu de l'affiche : L'Espace Chill (80 €),
--    L'Espace Business (100 €), Chill + Business (150 € au lieu de 180 €). Mise à jour seulement si la formule porte
--    encore son nom d'origine et n'a pas déjà de contenu (rejouable sans risque, ne touche pas une formule modifiée).
--    Les adhésions existantes ne changent pas : elles pointent sur l'identifiant de la formule.

-- ─────────────────────────────────────────────
-- 1. Formules
-- ─────────────────────────────────────────────
ALTER TABLE public.formules
  ADD COLUMN IF NOT EXISTS rythme TEXT
    CONSTRAINT formules_rythme_longueur CHECK (rythme IS NULL OR length(rythme) <= 120),
  ADD COLUMN IF NOT EXISTS prix_barre NUMERIC(8,2)
    CONSTRAINT formules_prix_barre_positif CHECK (prix_barre IS NULL OR prix_barre >= 0),
  ADD COLUMN IF NOT EXISTS mise_en_avant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activites JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT formules_activites_liste CHECK (
      CASE WHEN jsonb_typeof(activites) = 'array'
        THEN jsonb_array_length(activites) <= 12 AND length(activites::text) <= 4000
        ELSE FALSE END),
  ADD COLUMN IF NOT EXISTS compris TEXT[] NOT NULL DEFAULT '{}'
    CONSTRAINT formules_compris_liste CHECK (cardinality(compris) <= 20 AND length(array_to_string(compris, '')) <= 4000);

COMMENT ON COLUMN public.formules.rythme IS 'Rythme affiché sur la carte de l''offre (page Nos offres).';
COMMENT ON COLUMN public.formules.prix_barre IS 'Prix barré affiché à côté du prix (« au lieu de »), facultatif.';
COMMENT ON COLUMN public.formules.mise_en_avant IS 'Carte mise en avant sur la page Nos offres (« Le plus complet »).';
COMMENT ON COLUMN public.formules.activites IS 'Activités de l''offre : [{nom, lieu, espace}], espace = slug de l''espace (couleur de la pastille).';
COMMENT ON COLUMN public.formules.compris IS 'Ce qui est compris dans l''offre, une ligne par point.';

-- ─────────────────────────────────────────────
-- 2. Bon à savoir
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bon_a_savoir (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL CHECK (length(btrim(question)) BETWEEN 1 AND 300),
  reponse     TEXT NOT NULL DEFAULT '' CHECK (length(reponse) <= 3000),
  est_publiee BOOLEAN NOT NULL DEFAULT FALSE,
  ordre       INTEGER NOT NULL DEFAULT 0,
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bon_a_savoir IS 'Questions « Bon à savoir » de la page Nos offres, saisies par les administrateurs.';

DROP TRIGGER IF EXISTS trg_bon_a_savoir_modifie_le ON public.bon_a_savoir;
CREATE TRIGGER trg_bon_a_savoir_modifie_le
  BEFORE UPDATE ON public.bon_a_savoir
  FOR EACH ROW EXECUTE FUNCTION public.maj_modifie_le();

ALTER TABLE public.bon_a_savoir ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bon_a_savoir_lecture_publique ON public.bon_a_savoir;
CREATE POLICY bon_a_savoir_lecture_publique ON public.bon_a_savoir
  FOR SELECT TO anon, authenticated USING (est_publiee);

DROP POLICY IF EXISTS bon_a_savoir_admin ON public.bon_a_savoir;
CREATE POLICY bon_a_savoir_admin ON public.bon_a_savoir
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

-- Supabase accorde par défaut tous les droits aux visiteurs sur une nouvelle table : on ne leur laisse que la lecture.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.bon_a_savoir FROM anon;
GRANT SELECT ON public.bon_a_savoir TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bon_a_savoir TO authenticated;

-- ─────────────────────────────────────────────
-- 3. Contenu de l'affiche
-- ─────────────────────────────────────────────
UPDATE public.formules SET
  nom = 'L''Espace Chill',
  description = 'Souffler, créer et se rencontrer entre femmes.',
  couleur = 'rose',
  ordre = 1,
  rythme = '1 café et 1 atelier par mois',
  activites = '[
    {"nom": "Café Papotages*", "lieu": "Le Flow bien-être, Gagny", "espace": "papotages"},
    {"nom": "Atelier créatif", "lieu": "Gagny, lieu à définir", "espace": "creatifs"}
  ]'::jsonb,
  compris = ARRAY[
    'Un atelier créatif par mois, avec un thème différent : bougie, aquarelle, macramé, poterie…',
    'Le matériel nécessaire pour chaque atelier.',
    'Un Café Papotages par mois pour souffler et se rencontrer.',
    'Ton espace adhérente dédié sur notre site internet.',
    'Le magazine du club.',
    'Et surtout, des moments pour créer ensemble et partager entre femmes !'
  ]
WHERE nom = 'Cocooning Créatif' AND rythme IS NULL;

UPDATE public.formules SET
  nom = 'L''Espace Business',
  ordre = 2,
  rythme = '2 jeudis par mois',
  activites = '[
    {"nom": "Café Papotages*", "lieu": "Le Flow bien-être, Gagny", "espace": "papotages"},
    {"nom": "Coworking*", "lieu": "La Picorette, Le Raincy", "espace": "business"},
    {"nom": "Création de contenu", "lieu": "La Picorette, Le Raincy", "espace": "business"}
  ]'::jsonb,
  compris = ARRAY[
    'La location de la salle pour nos journées de création.',
    'Le matériel nécessaire pour réaliser nos photos et vidéos.',
    'Ta mise en avant sur notre Instagram, notre site web et notre magazine.',
    'Ton espace adhérente dédié sur notre site internet.',
    'Le magazine du club.',
    'Et surtout, des moments pour créer ensemble, s''entraider et avancer sur nos projets !'
  ]
WHERE nom = 'Cocooning Business' AND rythme IS NULL;

UPDATE public.formules SET
  nom = 'Chill + Business',
  ordre = 3,
  rythme = 'Les deux univers réunis',
  prix_barre = 180,
  mise_en_avant = TRUE,
  activites = '[
    {"nom": "Café Papotages*", "lieu": "Le Flow bien-être, Gagny", "espace": "papotages"},
    {"nom": "Atelier créatif", "lieu": "Gagny, lieu à définir", "espace": "creatifs"},
    {"nom": "Coworking*", "lieu": "La Picorette, Le Raincy", "espace": "business"},
    {"nom": "Création de contenu", "lieu": "La Picorette, Le Raincy", "espace": "business"}
  ]'::jsonb,
  compris = ARRAY[
    'Tout l''Espace Chill : ateliers créatifs et leur matériel, Café Papotages.',
    'Tout l''Espace Business : salle des journées de création, matériel photo et vidéo, mise en avant.',
    'Ton espace adhérente dédié sur notre site internet.',
    'Le magazine du club.',
    'Et surtout, des moments pour créer, s''entraider et avancer ensemble !'
  ]
WHERE nom = 'Cocooning Complet' AND rythme IS NULL;
