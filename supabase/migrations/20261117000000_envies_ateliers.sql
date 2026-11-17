-- =====================================================
-- Boîte à envies : formulaire caché « Tes envies d'ateliers » (17/11)
-- =====================================================
-- Page publique /envies-ateliers (sans connexion, pas dans le menu ni sur Google ; lien dans le pied de page).
-- Chacune y dépose une idée d'atelier Papotages ou Créatif ; les administratrices les relisent dans
-- Admin → Envies d'ateliers.
--   * envies_ateliers : les réponses. Dépôt ouvert à tous (anon compris), lecture et suivi par les
--     administratrices seulement. Comme le filet de sécurité des pré-inscriptions, la table ne refuse
--     pas une réponse pour un détail : les textes trop longs sont tronqués, une valeur inconnue est vidée.
--     Limite d'envois : 20 par heure et par adresse IP (hors administratrices).
--   * parametres_envies : une seule ligne, le plafond du matériel pris en charge par l'association
--     (affiché dans le formulaire ; NULL = pas de montant affiché). Lisible par tous, modifiable par
--     les administratrices.
-- Purge RGPD : envies de plus de 3 ans supprimées (même durée que les messages de contact).
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).
-- Rejouable sans risque.

CREATE TABLE IF NOT EXISTS public.envies_ateliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
  prenom          TEXT NOT NULL DEFAULT 'Sans prénom',
  nom             TEXT,
  contact         TEXT,             -- e-mail ou téléphone, facultatif
  espace          TEXT,             -- 'papotages' | 'creatifs' | 'je_ne_sais_pas' ; NULL = pas de réponse
  idee            TEXT NOT NULL DEFAULT '',
  details         TEXT,
  souhait         TEXT,             -- 'participer' | 'animer' | 'animer_ensemble'
  materiel        TEXT,
  budget          TEXT,             -- texte libre (« 25 € », « une trentaine d'euros »)
  jours           TEXT[] NOT NULL DEFAULT '{}',  -- lundi … dimanche
  plages          TEXT[] NOT NULL DEFAULT '{}',  -- plages horaires saisies librement (5 au plus, 100 caractères chacune)
  groupe_id       UUID,             -- idées envoyées ensemble (même personne, même formulaire)
  consentement_le TIMESTAMPTZ,
  statut          TEXT NOT NULL DEFAULT 'nouvelle',
  CONSTRAINT envies_ateliers_statut CHECK (statut IN ('nouvelle', 'a_etudier', 'retenue', 'programmee', 'classee'))
);

CREATE INDEX IF NOT EXISTS idx_envies_ateliers_cree_le ON public.envies_ateliers (cree_le);
CREATE INDEX IF NOT EXISTS idx_envies_ateliers_statut ON public.envies_ateliers (statut);
CREATE INDEX IF NOT EXISTS idx_envies_ateliers_groupe ON public.envies_ateliers (groupe_id);

COMMENT ON TABLE public.envies_ateliers IS
  'Envies d''ateliers déposées par le formulaire caché /envies-ateliers ; lues par les administratrices.';

-- Prépare chaque envie : tronque, vide les valeurs inconnues, et pour une visiteuse ou une membre
-- impose le statut « nouvelle », la date du jour et la limite d'envois.
CREATE OR REPLACE FUNCTION private.preparer_envie_atelier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.prenom   := COALESCE(NULLIF(left(btrim(COALESCE(NEW.prenom, '')), 100), ''), 'Sans prénom');
  NEW.nom      := NULLIF(left(btrim(COALESCE(NEW.nom, '')), 100), '');
  NEW.contact  := NULLIF(left(btrim(COALESCE(NEW.contact, '')), 255), '');
  NEW.idee     := left(btrim(COALESCE(NEW.idee, '')), 300);
  NEW.details  := NULLIF(left(btrim(COALESCE(NEW.details, '')), 3000), '');
  NEW.materiel := NULLIF(left(btrim(COALESCE(NEW.materiel, '')), 1000), '');
  NEW.budget   := NULLIF(left(btrim(COALESCE(NEW.budget, '')), 50), '');
  IF NEW.espace IS NOT NULL AND NEW.espace NOT IN ('papotages', 'creatifs', 'je_ne_sais_pas') THEN
    NEW.espace := NULL;
  END IF;
  IF NEW.souhait IS NOT NULL AND NEW.souhait NOT IN ('participer', 'animer', 'animer_ensemble') THEN
    NEW.souhait := NULL;
  END IF;
  -- Jours gardés dans l'ordre de la semaine, sans doublon ni valeur inconnue.
  NEW.jours := COALESCE(
    ARRAY(SELECT j FROM unnest(ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']) WITH ORDINALITY AS s(j, n)
          WHERE j = ANY (COALESCE(NEW.jours, '{}')) ORDER BY n),
    '{}');
  -- Plages horaires saisies librement : espaces superflus retirés, vides et doublons retirés, 100 caractères
  -- et 5 plages au plus, dans l'ordre saisi.
  NEW.plages := COALESCE(
    ARRAY(SELECT p FROM (
            SELECT left(regexp_replace(btrim(p), '\s+', ' ', 'g'), 100) AS p, min(n) AS n
            FROM unnest(COALESCE(NEW.plages, '{}')) WITH ORDINALITY AS s(p, n)
            WHERE btrim(COALESCE(p, '')) <> ''
            GROUP BY 1) AS v
          ORDER BY n LIMIT 5),
    '{}');
  NEW.modifie_le := now();

  IF TG_OP = 'INSERT' AND private.est_client_non_admin() THEN
    NEW.cree_le := now();
    NEW.statut  := 'nouvelle';
    PERFORM private.verifier_limite_envois('envie', 'ip:' || private.ip_client(), 20, INTERVAL '1 hour');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.preparer_envie_atelier() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_preparer_envie_atelier ON public.envies_ateliers;
CREATE TRIGGER trg_preparer_envie_atelier
  BEFORE INSERT OR UPDATE ON public.envies_ateliers
  FOR EACH ROW EXECUTE FUNCTION private.preparer_envie_atelier();

ALTER TABLE public.envies_ateliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS envies_ateliers_depot ON public.envies_ateliers;
CREATE POLICY envies_ateliers_depot ON public.envies_ateliers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS envies_ateliers_admin ON public.envies_ateliers;
CREATE POLICY envies_ateliers_admin ON public.envies_ateliers
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

REVOKE ALL ON public.envies_ateliers FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.envies_ateliers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.envies_ateliers TO authenticated;

-- Réglage : plafond du matériel pris en charge (une seule ligne).
CREATE TABLE IF NOT EXISTS public.parametres_envies (
  id               BOOLEAN PRIMARY KEY DEFAULT true,
  plafond_materiel NUMERIC(8, 2),
  modifie_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parametres_envies_une_ligne CHECK (id),
  CONSTRAINT parametres_envies_plafond CHECK (plafond_materiel IS NULL OR plafond_materiel >= 0)
);

INSERT INTO public.parametres_envies (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.parametres_envies IS
  'Réglage du formulaire des envies d''ateliers : plafond du matériel pris en charge par l''association (NULL = non affiché).';

ALTER TABLE public.parametres_envies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parametres_envies_lecture ON public.parametres_envies;
CREATE POLICY parametres_envies_lecture ON public.parametres_envies
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS parametres_envies_admin ON public.parametres_envies;
CREATE POLICY parametres_envies_admin ON public.parametres_envies
  FOR UPDATE TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

REVOKE ALL ON public.parametres_envies FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.parametres_envies TO anon, authenticated;
GRANT UPDATE (plafond_materiel, modifie_le) ON public.parametres_envies TO authenticated;

-- Purge RGPD : même fonction que 20261025000000, plus les envies d'ateliers de plus de 3 ans.
CREATE OR REPLACE FUNCTION private.purger_donnees_anciennes()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c_visites    CONSTANT INTERVAL := INTERVAL '13 months';
  c_journal    CONSTANT INTERVAL := INTERVAL '12 months';
  c_contacts   CONSTANT INTERVAL := INTERVAL '3 years';
  c_invites    CONSTANT INTERVAL := INTERVAL '3 years';
  c_naissance  CONSTANT INTERVAL := INTERVAL '30 days';
  c_secours    CONSTANT INTERVAL := INTERVAL '6 months';
  c_envies     CONSTANT INTERVAL := INTERVAL '3 years';
  n_visites    INT;
  n_journal    INT;
  n_contacts   INT;
  n_invites    INT;
  n_naissance  INT;
  n_secours    INT;
  n_envies     INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  DELETE FROM public.pre_inscriptions_secours WHERE cree_le < now() - c_secours;
  GET DIAGNOSTICS n_secours = ROW_COUNT;

  DELETE FROM public.envies_ateliers WHERE cree_le < now() - c_envies;
  GET DIAGNOSTICS n_envies = ROW_COUNT;

  -- Date de naissance : effacée peu après l'atelier (membres et invités).
  -- Doit passer avant l'anonymisation, qui l'efface aussi pour les anciens invités.
  UPDATE public.inscriptions i
  SET    date_naissance = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.date_naissance IS NOT NULL
    AND  a.date_atelier < current_date - c_naissance;
  GET DIAGNOSTICS n_naissance = ROW_COUNT;

  UPDATE public.inscriptions i
  SET    nom_invite       = 'Anonymisé',
         prenom_invite    = 'Anonymisé',
         email_invite     = 'anonyme-' || i.id || '@anonyme.invalid',
         telephone_invite = NULL,
         date_naissance   = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.utilisateur_id IS NULL
    AND  a.date_atelier < current_date - c_invites
    AND  i.email_invite NOT LIKE '%@anonyme.invalid';
  GET DIAGNOSTICS n_invites = ROW_COUNT;

  RETURN jsonb_build_object(
    'visites_supprimees',       n_visites,
    'journal_supprime',         n_journal,
    'messages_supprimes',       n_contacts,
    'demandes_secours_supprimees', n_secours,
    'envies_supprimees',        n_envies,
    'dates_naissance_effacees', n_naissance,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, demandes de secours 6 mois, envies d''ateliers 3 ans, dates de naissance 30 jours après l''atelier, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';
