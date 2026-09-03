-- =====================================================
-- Suppression de l'offre « Membre Premium »
-- =====================================================
-- Le club ne propose plus de palier d'adhésion premium : un seul
-- niveau de membre existe désormais (rôle `membre`). Cette migration :
--   1. Bascule les comptes existants en 'membre_premium' vers 'membre'.
--   2. Retire la policy RLS qui donnait un accès élargi aux documents
--      « premium » aux membres premium.
--   3. Bascule les documents marqués acces = 'premium' vers 'membres'.
--   4. Retire le tarif premium des ateliers (colonne tarif_premium) et
--      met à jour la vue publique associée en conséquence.
--
-- Note : les valeurs d'enum 'membre_premium' (role_utilisateur) et
-- 'premium' (acces_document) restent déclarées au niveau SQL —
-- PostgreSQL ne permet pas de retirer une valeur d'un type ENUM sans
-- reconstruire entièrement le type (DROP + CREATE + migration de la
-- colonne), ce qui obligerait à supprimer puis recréer à l'identique
-- plus de 40 policies RLS réparties sur une dizaine de tables, sans
-- pouvoir les valider en direct depuis cet environnement. Ces deux
-- valeurs deviennent inertes : plus aucun code applicatif ne les émet,
-- aucune ligne ne les utilise après cette migration, et l'interface ne
-- les propose plus nulle part.
-- =====================================================

-- 1. Bascule des comptes premium existants vers membre standard
UPDATE public.utilisateurs
SET    role = 'membre'
WHERE  role = 'membre_premium';

-- 2. Retrait de la policy documents réservée aux membres premium
DROP POLICY IF EXISTS "documents_lecture_premium" ON public.documents;

-- 3. Bascule des documents « premium » vers « membres »
UPDATE public.documents
SET    acces = 'membres'
WHERE  acces = 'premium';

-- 4. Retrait du tarif premium sur les ateliers.
--    vue_prochains_ateliers sélectionne explicitement la colonne : on
--    la recrée sans elle avant de pouvoir retirer la colonne.
DROP VIEW IF EXISTS public.vue_prochains_ateliers;

ALTER TABLE public.ateliers
  DROP COLUMN IF EXISTS tarif_premium;

CREATE VIEW public.vue_prochains_ateliers AS
SELECT
  a.id,
  a.titre,
  a.description,
  a.description_courte,
  c.nom AS categorie,
  c.slug AS categorie_slug,
  a.niveau,
  a.lieu,
  a.date_atelier,
  a.heure_debut,
  a.duree,
  a.places_disponibles,
  a.places_max,
  a.tarif_standard,
  a.tarif_affichage,
  a.url_image,
  a.statut,
  f.prenom AS formateur_prenom,
  f.nom AS formateur_nom,
  f.url_photo AS formateur_photo
FROM ateliers a
JOIN categories c ON a.categorie_id = c.id
LEFT JOIN formateurs f ON a.formateur_id = f.id
WHERE a.statut IN ('publie', 'complet')
  AND a.date_atelier >= CURRENT_DATE
ORDER BY a.date_atelier ASC, a.heure_debut ASC;
