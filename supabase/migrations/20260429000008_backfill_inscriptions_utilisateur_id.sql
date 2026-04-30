-- =====================================================
-- Backfill : relier les inscriptions invité aux comptes existants
-- =====================================================
-- Plusieurs inscriptions ont été créées en mode invité (utilisateur_id
-- NULL) alors que l'email_invite correspond à un compte utilisateurs
-- déjà existant (admin / membre / premium). Conséquences :
--   - aucun badge dans /admin/pre-inscriptions ni /admin/ateliers
--   - les inscriptions ne remontent pas dans /espace-membre/inscriptions
--     du compte concerné
--   - le tarif appliqué retombe sur tarif_standard, jamais tarif_premium
--
-- On les rebranche en cherchant l'utilisateur par email (insensible à
-- la casse). Si plusieurs utilisateurs partageaient le même email
-- (anormal — l'admin peut le corriger ensuite), on prend l'id le plus
-- récent.
-- =====================================================

UPDATE public.inscriptions i
SET    utilisateur_id = sub.user_id
FROM (
  SELECT DISTINCT ON (lower(u.email))
         lower(u.email) AS email,
         u.id            AS user_id
  FROM   public.utilisateurs u
  WHERE  u.email IS NOT NULL
  ORDER  BY lower(u.email), u.cree_le DESC
) sub
WHERE  i.utilisateur_id IS NULL
  AND  i.email_invite IS NOT NULL
  AND  lower(i.email_invite) = sub.email;
