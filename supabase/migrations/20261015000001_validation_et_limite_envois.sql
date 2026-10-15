-- =====================================================
-- Formulaires publics : validation côté serveur + limite d'envois (anti-spam)
-- =====================================================
-- Le site vérifie déjà les champs dans le navigateur, mais un robot peut
-- appeler l'API Supabase directement. Ces triggers refont les contrôles dans
-- la base pour les pré-inscriptions et les messages de contact :
--
--   - format et longueur des champs (email, téléphone, noms, date de
--     naissance, taille du message) ;
--   - pas de doublon : une seule pré-inscription active par email (ou par
--     compte) et par atelier ;
--   - limite d'envois par adresse IP et par email sur une heure glissante.
--
-- Les messages d'erreur (code P0001) sont rédigés pour le public : le site
-- les affiche tels quels (src/utils/messageErreurServeur.ts).
--
-- Comme pour 20261015000000_verrouille_colonnes_sensibles.sql, seules les
-- requêtes des clients non administrateurs sont concernées.
-- Dépend de private.est_client_non_admin() créée par cette migration-là.
-- =====================================================


-- ─────────────────────────────────────────────
-- Journal des envois pour la limite de débit
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private.envois_publics (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cible    TEXT        NOT NULL,  -- 'inscription' | 'contact'
  cle      TEXT        NOT NULL,  -- 'ip:1.2.3.4' ou 'email:x@y.fr'
  cree_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_envois_publics_cible_cle_date
  ON private.envois_publics (cible, cle, cree_le);

-- Schéma private non exposé par l'API ; on ferme quand même la table.
REVOKE ALL ON private.envois_publics FROM PUBLIC, anon, authenticated;
ALTER TABLE private.envois_publics ENABLE ROW LEVEL SECURITY;


-- Adresse IP du visiteur telle que transmise par l'API Supabase.
-- Peut être NULL (appel interne) : la limite par IP est alors ignorée,
-- celle par email reste active.
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
  IF v_headers IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN NULLIF(trim(COALESCE(
    v_headers ->> 'cf-connecting-ip',
    split_part(v_headers ->> 'x-forwarded-for', ',', 1),
    v_headers ->> 'x-real-ip'
  )), '');
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;


-- Lève une erreur si `cle` a déjà fait `p_max` envois vers `p_cible` sur
-- `p_fenetre`, sinon enregistre l'envoi. SECURITY DEFINER : les visiteurs
-- n'ont aucun droit direct sur private.envois_publics.
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

  IF (
    SELECT count(*) FROM private.envois_publics
    WHERE cible = p_cible AND cle = p_cle AND cree_le > now() - p_fenetre
  ) >= p_max THEN
    RAISE EXCEPTION 'Trop d''envois en peu de temps. Merci de réessayer dans une heure, ou écrivez-nous à le.cocooning.club@gmail.com.';
  END IF;

  INSERT INTO private.envois_publics (cible, cle) VALUES (p_cible, p_cle);

  -- Ménage au fil de l'eau : on ne garde que les dernières 48 h.
  DELETE FROM private.envois_publics WHERE cree_le < now() - INTERVAL '48 hours';
END;
$$;

-- Vérifie s'il existe déjà une pré-inscription active pour cet atelier.
-- SECURITY DEFINER : un visiteur anonyme ne peut pas lire la table
-- inscriptions (RLS), mais on doit pouvoir détecter le doublon.
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
    SELECT 1 FROM public.inscriptions i
    WHERE i.atelier_id = p_atelier
      AND i.statut <> 'annule'
      AND (
        (p_email IS NOT NULL AND lower(i.email_invite) = lower(p_email))
        OR (p_utilisateur IS NOT NULL AND i.utilisateur_id = p_utilisateur)
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION private.ip_client()                                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.verifier_limite_envois(TEXT, TEXT, INT, INTERVAL) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.inscription_active_existe(UUID, TEXT, UUID)    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.ip_client()                                    TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION private.verifier_limite_envois(TEXT, TEXT, INT, INTERVAL) TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION private.inscription_active_existe(UUID, TEXT, UUID)    TO anon, authenticated;


-- Formats communs
CREATE OR REPLACE FUNCTION private.email_valide(p TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT p ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' AND length(p) <= 255 $$;

CREATE OR REPLACE FUNCTION private.telephone_valide(p TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT p ~ '^[0-9 +().-]{6,20}$' $$;

REVOKE EXECUTE ON FUNCTION private.email_valide(TEXT)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.telephone_valide(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION private.email_valide(TEXT)     TO anon, authenticated;
GRANT  EXECUTE ON FUNCTION private.telephone_valide(TEXT) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- Pré-inscriptions
-- ─────────────────────────────────────────────
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valider_inscription ON public.inscriptions;
CREATE TRIGGER trg_valider_inscription
  BEFORE INSERT ON public.inscriptions
  FOR EACH ROW EXECUTE FUNCTION private.valider_inscription();


-- ─────────────────────────────────────────────
-- Messages de contact
-- ─────────────────────────────────────────────
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_valider_contact_message ON public.contact_messages;
CREATE TRIGGER trg_valider_contact_message
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION private.valider_contact_message();

REVOKE EXECUTE ON FUNCTION private.valider_inscription()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.valider_contact_message() FROM PUBLIC;
