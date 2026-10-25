-- =====================================================
-- Filet de sécurité des pré-inscriptions : on ne perd jamais un contact
-- =====================================================
-- Le site enregistre une pré-inscription dans `inscriptions`. Si cet enregistrement échoue
-- (panne, limite d'envois atteinte, atelier retiré, erreur du navigateur…), il envoie les
-- coordonnées de la personne dans cette table, volontairement très permissive :
--   * aucune clé étrangère, aucune contrainte qui puisse refuser une ligne ;
--   * les champs trop longs sont tronqués au lieu d'être refusés ;
--   * seule une limite très large d'envois par adresse IP (60 par heure) protège la table.
-- Les administrateurs relisent ces demandes dans « Pré-inscriptions » et les traitent à la main.
-- Les demandes de plus de 6 mois sont supprimées (purge RGPD quotidienne).
-- Utilise private.utilisateur_est_admin() (et non private.is_admin(), absent en prod).

CREATE TABLE IF NOT EXISTS public.pre_inscriptions_secours (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cree_le        TIMESTAMPTZ NOT NULL DEFAULT now(),
  nom            TEXT NOT NULL DEFAULT 'Sans nom',
  email          TEXT,
  telephone      TEXT,
  date_naissance TEXT,
  atelier_id     UUID,
  atelier_titre  TEXT,
  utilisateur_id UUID,
  erreur         TEXT
);

CREATE INDEX IF NOT EXISTS idx_pre_inscriptions_secours_cree_le ON public.pre_inscriptions_secours (cree_le);

-- Tronque au lieu de refuser : la ligne est toujours acceptée.
CREATE OR REPLACE FUNCTION private.preparer_pre_inscription_secours()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.nom            := COALESCE(NULLIF(left(btrim(COALESCE(NEW.nom, '')), 200), ''), 'Sans nom');
  NEW.email          := NULLIF(left(btrim(COALESCE(NEW.email, '')), 255), '');
  NEW.telephone      := NULLIF(left(btrim(COALESCE(NEW.telephone, '')), 40), '');
  NEW.date_naissance := NULLIF(left(btrim(COALESCE(NEW.date_naissance, '')), 20), '');
  NEW.atelier_titre  := NULLIF(left(btrim(COALESCE(NEW.atelier_titre, '')), 300), '');
  NEW.erreur         := NULLIF(left(btrim(COALESCE(NEW.erreur, '')), 500), '');

  -- Seuls les clients non administrateurs (visiteurs, membres) sont concernés par la limite.
  IF private.est_client_non_admin() THEN
    NEW.cree_le := now();
    PERFORM private.verifier_limite_envois('secours', 'ip:' || private.ip_client(), 60, INTERVAL '1 hour');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.preparer_pre_inscription_secours() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_preparer_pre_inscription_secours ON public.pre_inscriptions_secours;
CREATE TRIGGER trg_preparer_pre_inscription_secours
  BEFORE INSERT ON public.pre_inscriptions_secours
  FOR EACH ROW EXECUTE FUNCTION private.preparer_pre_inscription_secours();

ALTER TABLE public.pre_inscriptions_secours ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut déposer une demande ; seuls les administrateurs la lisent et la suppriment.
DROP POLICY IF EXISTS pre_inscriptions_secours_depot ON public.pre_inscriptions_secours;
CREATE POLICY pre_inscriptions_secours_depot ON public.pre_inscriptions_secours
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS pre_inscriptions_secours_admin ON public.pre_inscriptions_secours;
CREATE POLICY pre_inscriptions_secours_admin ON public.pre_inscriptions_secours
  FOR ALL TO authenticated
  USING (private.utilisateur_est_admin()) WITH CHECK (private.utilisateur_est_admin());

REVOKE ALL ON public.pre_inscriptions_secours FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.pre_inscriptions_secours TO anon, authenticated;
GRANT SELECT, DELETE ON public.pre_inscriptions_secours TO authenticated;

-- Purge RGPD : même fonction que 20261024000002, plus les demandes de secours de plus de 6 mois.
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
  n_visites    INT;
  n_journal    INT;
  n_contacts   INT;
  n_invites    INT;
  n_naissance  INT;
  n_secours    INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  DELETE FROM public.pre_inscriptions_secours WHERE cree_le < now() - c_secours;
  GET DIAGNOSTICS n_secours = ROW_COUNT;

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
    'dates_naissance_effacees', n_naissance,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, demandes de secours 6 mois, dates de naissance 30 jours après l''atelier, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';
