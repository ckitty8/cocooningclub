-- =====================================================
-- Cohérence fonctionnelle (revue du 16/10/2026)
-- =====================================================
-- Corrige quatre fonctionnalités qui ne marchaient pas en production :
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
