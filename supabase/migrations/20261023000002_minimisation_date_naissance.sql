-- =====================================================
-- Minimisation de la date de naissance
-- =====================================================
-- La date de naissance n'est utile que pour un atelier (thème astrologique) et
-- est saisie sur la pré-inscription. La copie stockée sur le compte
-- (utilisateurs.date_naissance) n'était lue par aucune fonctionnalité :
--
--   1. supprime utilisateurs.date_naissance (sans CASCADE : échoue si une vue
--      ou une règle l'utilise encore) ;
--   2. la purge RGPD efface désormais inscriptions.date_naissance 30 jours
--      après la date de l'atelier, pour les membres comme pour les invités.
--
-- Remplace private.purger_donnees_anciennes() de 20261023000001 par une
-- version identique + l'étape 2.
-- =====================================================

ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS date_naissance;

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
  n_visites    INT;
  n_journal    INT;
  n_contacts   INT;
  n_invites    INT;
  n_naissance  INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

  -- Date de naissance : effacée peu après l'atelier (membres et invités).
  -- Doit passer avant l'anonymisation, qui l'efface aussi pour les anciens invités.
  UPDATE public.inscriptions i
  SET    date_naissance = NULL
  FROM   public.ateliers a
  WHERE  a.id = i.atelier_id
    AND  i.date_naissance IS NOT NULL
    AND  a.date_atelier < current_date - c_naissance;
  GET DIAGNOSTICS n_naissance = ROW_COUNT;

  -- La contrainte chk_participant impose un nom, un prénom et un email aux
  -- invités : on met des valeurs neutres. L'email reste unique par ligne pour
  -- ne pas déclencher la détection de doublons.
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
    'dates_naissance_effacees', n_naissance,
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, dates de naissance 30 jours après l''atelier, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';
