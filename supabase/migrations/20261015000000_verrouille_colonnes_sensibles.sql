-- =====================================================
-- Sécurité : verrouille les colonnes sensibles modifiables depuis le navigateur
-- =====================================================
-- Les policies RLS filtrent les LIGNES, pas les COLONNES. Plusieurs policies
-- laissaient donc un client (visiteur anonyme ou membre connecté) écrire des
-- valeurs qu'il ne devrait jamais pouvoir choisir lui-même :
--
--   1. utilisateurs (policy "update self") : un membre pouvait passer son
--      propre `role` à 'administrateur' → accès complet à l'admin.
--   2. inscriptions (insert public WITH CHECK (true)) : une pré-inscription
--      pouvait arriver déjà 'confirme' / 'paye' / 'present', ou rattachée au
--      compte d'un autre membre.
--   3. inscriptions (update owner) : un membre pouvait marquer sa propre
--      inscription comme payée ou présente, au lieu de seulement l'annuler.
--   4. avis (insert) : un membre pouvait publier directement un avis
--      'approuve' et 'mis_en_avant', ou noter une inscription qui n'est pas
--      la sienne.
--
-- Correctif : triggers BEFORE qui s'appliquent quelles que soient les
-- policies en place (y compris celles créées hors migrations).
--
-- Qui est concerné : uniquement les requêtes du site, qui passent par
-- PostgREST avec les rôles `anon` ou `authenticated`. Les administratrices
-- (private.is_admin()), le SQL editor, le service_role et les triggers
-- internes (rôle postgres / supabase_auth_admin) ne sont pas bridés.
-- =====================================================


-- Helper : la requête vient-elle d'un client du site non administrateur ?
-- `anon` n'a pas accès au schéma private : on ne doit pas appeler
-- is_admin() pour lui, d'où l'évaluation en deux temps.
CREATE OR REPLACE FUNCTION private.est_client_non_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user = 'anon' THEN
    RETURN TRUE;
  ELSIF current_user = 'authenticated' THEN
    RETURN NOT private.is_admin();
  END IF;
  RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.est_client_non_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.est_client_non_admin() TO anon, authenticated;
-- anon doit pouvoir résoudre private.est_client_non_admin() dans les
-- triggers d'inscription (les autres objets de private restent fermés :
-- is_admin() n'est exécutable que par authenticated).
GRANT USAGE ON SCHEMA private TO anon;


-- ─────────────────────────────────────────────
-- 1. utilisateurs : rôle, statut et abonnement réservés aux admins
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.proteger_utilisateurs()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role             := 'inscrit';
    NEW.est_actif        := TRUE;
    NEW.debut_abonnement := NULL;
    NEW.fin_abonnement   := NULL;
    RETURN NEW;
  END IF;

  IF NEW.id               IS DISTINCT FROM OLD.id
  OR NEW.role             IS DISTINCT FROM OLD.role
  OR NEW.est_actif        IS DISTINCT FROM OLD.est_actif
  OR NEW.debut_abonnement IS DISTINCT FROM OLD.debut_abonnement
  OR NEW.fin_abonnement   IS DISTINCT FROM OLD.fin_abonnement
  OR NEW.cree_le          IS DISTINCT FROM OLD.cree_le
  THEN
    RAISE EXCEPTION 'Modification non autorisée : seuls les administrateurs peuvent changer le rôle, le statut ou l''abonnement d''un compte.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_utilisateurs ON public.utilisateurs;
CREATE TRIGGER trg_proteger_utilisateurs
  BEFORE INSERT OR UPDATE ON public.utilisateurs
  FOR EACH ROW EXECUTE FUNCTION private.proteger_utilisateurs();


-- ─────────────────────────────────────────────
-- 2 & 3. inscriptions
-- ─────────────────────────────────────────────
-- INSERT : statut, paiement et présence imposés ; une inscription ne peut
--          être rattachée qu'au compte de la personne connectée.
-- UPDATE : un membre peut uniquement annuler sa propre inscription.
CREATE OR REPLACE FUNCTION private.proteger_inscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tarif NUMERIC;
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.utilisateur_id IS NOT NULL AND NEW.utilisateur_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Inscription non autorisée pour un autre compte.'
        USING ERRCODE = '42501';
    END IF;

    SELECT a.tarif_standard INTO v_tarif FROM public.ateliers a WHERE a.id = NEW.atelier_id;

    NEW.statut          := 'en_attente';
    -- Atelier inconnu ou tarif non renseigné : on part du principe qu'il
    -- faudra payer, l'admin corrigera si besoin.
    NEW.statut_paiement := CASE WHEN v_tarif IS NOT NULL AND v_tarif <= 0
                                THEN 'non_requis' ELSE 'en_attente' END;
    NEW.present         := FALSE;
    NEW.annule_le       := NULL;
    NEW.inscrit_le      := now();
    RETURN NEW;
  END IF;

  -- UPDATE : seule transition permise = annulation.
  IF NEW.statut <> 'annule'
  OR NEW.id              IS DISTINCT FROM OLD.id
  OR NEW.utilisateur_id  IS DISTINCT FROM OLD.utilisateur_id
  OR NEW.atelier_id      IS DISTINCT FROM OLD.atelier_id
  OR NEW.statut_paiement IS DISTINCT FROM OLD.statut_paiement
  OR NEW.present         IS DISTINCT FROM OLD.present
  OR NEW.inscrit_le      IS DISTINCT FROM OLD.inscrit_le
  THEN
    RAISE EXCEPTION 'Modification non autorisée : vous pouvez seulement annuler votre inscription.'
      USING ERRCODE = '42501';
  END IF;

  NEW.annule_le := COALESCE(OLD.annule_le, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_inscriptions ON public.inscriptions;
CREATE TRIGGER trg_proteger_inscriptions
  BEFORE INSERT OR UPDATE ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION private.proteger_inscriptions();


-- ─────────────────────────────────────────────
-- 4. avis : toujours soumis à modération, uniquement sur sa propre
--    participation à un atelier (présence validée par l'admin)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.proteger_avis()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inscriptions i
    WHERE i.id = NEW.inscription_id
      AND i.utilisateur_id = auth.uid()
      AND i.present
  ) THEN
    RAISE EXCEPTION 'Vous ne pouvez laisser un avis que sur un atelier auquel vous avez participé.'
      USING ERRCODE = '42501';
  END IF;

  NEW.utilisateur_id := auth.uid();
  NEW.moderation     := 'en_attente';
  NEW.mis_en_avant   := FALSE;
  NEW.modere_le      := NULL;
  NEW.nom_auteur     := NULL;
  NEW.cree_le        := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_avis ON public.avis;
CREATE TRIGGER trg_proteger_avis
  BEFORE INSERT ON public.avis
  FOR EACH ROW EXECUTE FUNCTION private.proteger_avis();


-- Les fonctions trigger n'ont pas à être appelables directement.
REVOKE EXECUTE ON FUNCTION private.proteger_utilisateurs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.proteger_inscriptions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.proteger_avis()         FROM PUBLIC;
