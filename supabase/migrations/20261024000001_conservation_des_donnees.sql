-- =====================================================
-- Durées de conservation des données personnelles (RGPD)
-- =====================================================
-- Jusqu'ici seule private.envois_publics était purgée (48 h). Cette migration
-- ajoute une purge planifiée pour le reste :
--
--   visites_site        supprimées après 13 mois
--   logs (journal admin) supprimés après 12 mois
--   contact_messages    supprimés après 3 ans
--   inscriptions d'invités (sans compte) anonymisées 3 ans après l'atelier :
--     nom, prénom, email, téléphone et date de naissance sont effacés, la ligne
--     reste pour les statistiques (présence, paiement, places).
--
-- Non concernés : les comptes membres (supprimés à la demande), et
-- transactions_paypal (conservées pour la comptabilité).
--
-- Les durées sont les constantes de la fonction ci-dessous : pour les changer,
-- republier la fonction, puis mettre à jour src/pages/Confidentialite.tsx.
--
-- La fonction n'est appelable ni par anon ni par authenticated : elle n'est
-- lancée que par pg_cron (rôle postgres) ou à la main depuis le SQL Editor.
-- Les triggers de protection laissent passer ces rôles (cf.
-- private.est_client_non_admin).
-- =====================================================

CREATE OR REPLACE FUNCTION private.purger_donnees_anciennes()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  c_visites   CONSTANT INTERVAL := INTERVAL '13 months';
  c_journal   CONSTANT INTERVAL := INTERVAL '12 months';
  c_contacts  CONSTANT INTERVAL := INTERVAL '3 years';
  c_invites   CONSTANT INTERVAL := INTERVAL '3 years';
  n_visites   INT;
  n_journal   INT;
  n_contacts  INT;
  n_invites   INT;
BEGIN
  DELETE FROM public.visites_site WHERE cree_le < now() - c_visites;
  GET DIAGNOSTICS n_visites = ROW_COUNT;

  DELETE FROM public.logs WHERE horodatage < now() - c_journal;
  GET DIAGNOSTICS n_journal = ROW_COUNT;

  DELETE FROM public.contact_messages WHERE cree_le < now() - c_contacts;
  GET DIAGNOSTICS n_contacts = ROW_COUNT;

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
    'invites_anonymises',       n_invites
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.purger_donnees_anciennes() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION private.purger_donnees_anciennes() IS
  'Purge RGPD : visites 13 mois, journal 12 mois, messages de contact 3 ans, invités anonymisés 3 ans après l''atelier. Renvoie le nombre de lignes traitées.';

-- Planification quotidienne (03:30 UTC) si pg_cron est disponible. On tente de
-- l'activer ; si ce n'est pas possible depuis la migration, activer
-- l'extension pg_cron dans Supabase (Database > Extensions) puis relancer ce bloc.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron indisponible (%) : la purge n''est PAS planifiée.', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purger_donnees_anciennes_daily';
    PERFORM cron.schedule(
      'purger_donnees_anciennes_daily',
      '30 3 * * *',
      $cron$SELECT private.purger_donnees_anciennes();$cron$
    );

    -- Constaté en prod le 23/10/2026 : pg_cron n'était pas installé, donc le job
    -- de 20260411000000 (passage des ateliers passés à « terminé ») n'a jamais
    -- été planifié ; seule la page admin Ateliers le faisait à l'ouverture.
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'depublier_ateliers_passes_daily';
    PERFORM cron.schedule(
      'depublier_ateliers_passes_daily',
      '0 3 * * *',
      $cron$SELECT public.depublier_ateliers_passes();$cron$
    );
  END IF;
END $$;
