-- =====================================================
-- Cohérence fonctionnelle (revue du 16/10/2026)
-- =====================================================
-- Corrige quatre fonctionnalités qui ne marchaient pas en production
-- (sections 1 à 4) et durcit l'anti-spam suite à la revue de code (section 5) :
--
--   1. Journal des actions admin : logs.action était resté un ENUM, alors que
--      le site écrit des clés libres ("atelier.create", "membre.update"…).
--      Chaque écriture échouait en silence : la table logs était vide.
--      La migration 20260418000001 qui corrigeait cela n'a jamais été appliquée.
--   2. Annulation d'inscription par un membre : aucune policy UPDATE ne
--      l'autorisait, le bouton « Annuler » ne modifiait rien. Le trigger
--      private.proteger_inscriptions limite déjà ce droit à l'annulation.
--   3. Place libérée à l'annulation : decrementer_places() s'exécutait avec
--      les droits du membre, qui ne peut pas modifier ateliers (RLS) : la
--      place n'était jamais rendue.
--   4. Témoignages de l'accueil : un visiteur ne peut lire ni utilisateurs ni
--      inscriptions (RLS), le nom de l'autrice et l'atelier s'affichaient
--      donc vides. Une fonction expose uniquement les champs publics.
-- =====================================================


-- ─────────────────────────────────────────────
-- 1. logs.action : ENUM → VARCHAR
-- ─────────────────────────────────────────────
-- vue_logs dépend de la colonne : on la supprime puis on la recrée à l'identique.
DROP VIEW IF EXISTS public.vue_logs;

ALTER TABLE public.logs
  ALTER COLUMN action TYPE VARCHAR(100) USING action::text;

DROP TYPE IF EXISTS public.type_action_log;

CREATE VIEW public.vue_logs
WITH (security_invoker = on) AS
SELECT
  l.id,
  l.utilisateur_id,
  COALESCE(u.prenom || ' ' || u.nom, '—') AS auteur,
  u.email                                 AS auteur_email,
  u.couleur_conges                        AS auteur_couleur,
  u.code_couleur_conges                   AS auteur_code_couleur,
  l.action,
  l.table_cible,
  l.enregistrement_cible_id,
  l.details,
  l.adresse_ip,
  l.user_agent,
  l.horodatage
FROM public.logs l
LEFT JOIN public.utilisateurs u ON u.id = l.utilisateur_id
ORDER BY l.horodatage DESC;

REVOKE ALL ON public.vue_logs FROM anon;
GRANT SELECT ON public.vue_logs TO authenticated;


-- ─────────────────────────────────────────────
-- 2. Un membre peut annuler sa propre inscription
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS inscriptions_update_owner ON public.inscriptions;
CREATE POLICY inscriptions_update_owner ON public.inscriptions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = utilisateur_id)
  WITH CHECK ((SELECT auth.uid()) = utilisateur_id);


-- ─────────────────────────────────────────────
-- 3. Mise à jour des places quel que soit l'auteur du changement
-- ─────────────────────────────────────────────
-- Fonction trigger uniquement : elle n'est pas appelable via l'API.
CREATE OR REPLACE FUNCTION public.decrementer_places()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.statut = 'confirme' AND (TG_OP = 'INSERT' OR OLD.statut <> 'confirme') THEN
    UPDATE public.ateliers
    SET places_disponibles = places_disponibles - 1
    WHERE id = NEW.atelier_id AND places_disponibles > 0;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.statut = 'confirme'
     AND NEW.statut IN ('annule', 'en_attente') THEN
    UPDATE public.ateliers
    SET places_disponibles = places_disponibles + 1
    WHERE id = NEW.atelier_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrementer_places() FROM PUBLIC, anon, authenticated;


-- ─────────────────────────────────────────────
-- 4. Témoignages publics
-- ─────────────────────────────────────────────
-- Remplace vue_avis_publies (inutilisée, et vide pour un visiteur à cause
-- de la RLS sur utilisateurs / inscriptions).
DROP VIEW IF EXISTS public.vue_avis_publies;

-- SECURITY DEFINER pour lire au-delà de la RLS, mais ne renvoie que des
-- champs publics : prénom + initiale du nom, jamais l'email ni l'id.
CREATE OR REPLACE FUNCTION public.temoignages_publics(p_limite INT DEFAULT 12)
RETURNS TABLE (
  id            UUID,
  note          INT,
  commentaire   TEXT,
  auteur        TEXT,
  atelier_titre TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    av.id,
    av.note,
    COALESCE(av.commentaire, ''),
    COALESCE(
      NULLIF(trim(u.prenom || ' ' || COALESCE(left(u.nom, 1) || '.', '')), ''),
      NULLIF(trim(av.nom_auteur), ''),
      '—'
    ),
    a.titre
  FROM public.avis av
  LEFT JOIN public.utilisateurs u ON u.id = av.utilisateur_id
  LEFT JOIN public.inscriptions i ON i.id = av.inscription_id
  LEFT JOIN public.ateliers a     ON a.id = i.atelier_id
  WHERE av.moderation = 'approuve'
    AND av.mis_en_avant
  ORDER BY av.cree_le DESC
  LIMIT LEAST(GREATEST(p_limite, 1), 50);
$$;

REVOKE EXECUTE ON FUNCTION public.temoignages_publics(INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.temoignages_publics(INT) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- 5. Durcissements issus de la revue de code
-- ─────────────────────────────────────────────

-- 5a. Adresse IP : X-Forwarded-For est fourni par le client et donc
--     falsifiable ; on ne garde que les en-têtes posés par l'infrastructure.
--     Si aucun n'est présent, la limite par IP est ignorée et la limite
--     globale (5c) prend le relais.
CREATE OR REPLACE FUNCTION private.ip_client()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_headers JSONB;
BEGIN
  v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  RETURN NULLIF(trim(COALESCE(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-real-ip')), '');
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- 5b. Envois simultanés : un verrou par (cible, clé) sérialise le comptage,
--     sinon des requêtes parallèles voyaient toutes l'ancien total.
--     Index sur cree_le pour le ménage des envois de plus de 48 h.
CREATE INDEX IF NOT EXISTS idx_envois_publics_cree_le ON private.envois_publics (cree_le);

CREATE OR REPLACE FUNCTION private.verifier_limite_envois(
  p_cible TEXT, p_cle TEXT, p_max INT, p_fenetre INTERVAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_cle IS NULL THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_cible || '|' || p_cle, 0));

  IF (
    SELECT count(*) FROM private.envois_publics
    WHERE cible = p_cible AND cle = p_cle AND cree_le > now() - p_fenetre
  ) >= p_max THEN
    RAISE EXCEPTION 'Trop d''envois en peu de temps. Merci de réessayer dans une heure, ou écrivez-nous à le.cocooning.club@gmail.com.';
  END IF;

  INSERT INTO private.envois_publics (cible, cle) VALUES (p_cible, p_cle);
  DELETE FROM private.envois_publics WHERE cree_le < now() - INTERVAL '48 hours';
END;
$$;

-- 5c. Plafond global par heure, indépendant de l'IP et de l'email : dernier
--     filet si un robot change d'email à chaque envoi et qu'aucune IP fiable
--     n'est disponible. Les valeurs laissent une large marge au trafic réel
--     du club.
CREATE OR REPLACE FUNCTION private.valider_contact_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_valeur TEXT;
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  NEW.email     := NULLIF(trim(NEW.email), '');
  NEW.telephone := NULLIF(trim(NEW.telephone), '');

  IF NEW.email IS NOT NULL AND NOT private.email_valide(NEW.email) THEN
    RAISE EXCEPTION 'Adresse email invalide.';
  END IF;
  IF NEW.telephone IS NOT NULL AND NOT private.telephone_valide(NEW.telephone) THEN
    RAISE EXCEPTION 'Numéro de téléphone invalide.';
  END IF;

  IF NEW.reponses IS NULL OR jsonb_typeof(NEW.reponses) <> 'object'
     OR (SELECT count(*) FROM jsonb_object_keys(NEW.reponses)) > 30 THEN
    RAISE EXCEPTION 'Message invalide.';
  END IF;
  FOR v_valeur IN SELECT value FROM jsonb_each_text(NEW.reponses) LOOP
    IF length(v_valeur) > 2000 THEN
      RAISE EXCEPTION 'Votre message est trop long (2 000 caractères maximum par champ).';
    END IF;
  END LOOP;

  PERFORM private.verifier_limite_envois('contact', 'ip:' || private.ip_client(), 5, INTERVAL '1 hour');
  PERFORM private.verifier_limite_envois('contact', 'email:' || lower(NEW.email), 3, INTERVAL '1 hour');
  PERFORM private.verifier_limite_envois('contact', 'global', 30, INTERVAL '1 hour');

  RETURN NEW;
END;
$$;

-- 5d. Doublons : une pré-inscription de membre n'a pas d'email_invite. On
--     compare donc aussi l'email saisi à celui des comptes inscrits.
CREATE OR REPLACE FUNCTION private.inscription_active_existe(
  p_atelier UUID, p_email TEXT, p_utilisateur UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.inscriptions i
    LEFT JOIN public.utilisateurs u ON u.id = i.utilisateur_id
    WHERE i.atelier_id = p_atelier
      AND i.statut <> 'annule'
      AND (
        (p_email IS NOT NULL AND lower(p_email) IN (lower(i.email_invite), lower(u.email)))
        OR (p_utilisateur IS NOT NULL AND i.utilisateur_id = p_utilisateur)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.valider_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT private.est_client_non_admin() THEN
    RETURN NEW;
  END IF;

  NEW.email_invite     := NULLIF(trim(NEW.email_invite), '');
  NEW.prenom_invite    := NULLIF(trim(NEW.prenom_invite), '');
  NEW.nom_invite       := NULLIF(trim(NEW.nom_invite), '');
  NEW.telephone_invite := NULLIF(trim(NEW.telephone_invite), '');

  IF NEW.email_invite IS NOT NULL AND NOT private.email_valide(NEW.email_invite) THEN
    RAISE EXCEPTION 'Adresse email invalide.';
  END IF;
  IF length(NEW.prenom_invite) > 100 OR length(NEW.nom_invite) > 100 THEN
    RAISE EXCEPTION 'Le nom est trop long (100 caractères maximum).';
  END IF;
  IF NEW.telephone_invite IS NOT NULL AND NOT private.telephone_valide(NEW.telephone_invite) THEN
    RAISE EXCEPTION 'Numéro de téléphone invalide.';
  END IF;
  IF NEW.date_naissance IS NOT NULL
     AND (NEW.date_naissance < DATE '1900-01-01' OR NEW.date_naissance > current_date) THEN
    RAISE EXCEPTION 'Date de naissance invalide.';
  END IF;

  IF NEW.atelier_id IS NOT NULL
     AND private.inscription_active_existe(NEW.atelier_id, NEW.email_invite, NEW.utilisateur_id) THEN
    RAISE EXCEPTION 'Une pré-inscription existe déjà pour cet atelier avec ces coordonnées. Nous revenons vers vous très vite !';
  END IF;

  PERFORM private.verifier_limite_envois('inscription', 'ip:' || private.ip_client(), 10, INTERVAL '1 hour');
  PERFORM private.verifier_limite_envois('inscription', 'email:' || lower(NEW.email_invite), 5, INTERVAL '1 hour');
  PERFORM private.verifier_limite_envois('inscription', 'global', 100, INTERVAL '1 hour');

  RETURN NEW;
END;
$$;

-- 5e. Création de compte par un non-admin : refus explicite plutôt que
--     correction silencieuse. Cas réel visé : si la confirmation d'email est
--     désactivée, signUp() côté admin ouvre la session du nouveau compte et
--     l'insertion qui suit ne passe plus pour une action d'admin.
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
    IF NEW.role <> 'inscrit' OR NOT NEW.est_actif
       OR NEW.debut_abonnement IS NOT NULL OR NEW.fin_abonnement IS NOT NULL THEN
      RAISE EXCEPTION 'Création refusée : seul un administrateur peut attribuer un rôle, un statut ou un abonnement.'
        USING ERRCODE = '42501';
    END IF;
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
