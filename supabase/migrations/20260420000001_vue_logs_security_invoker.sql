-- =====================================================
-- vue_logs : passer en security_invoker=on
-- =====================================================
-- Par défaut, une vue Postgres s'exécute avec les droits du créateur
-- (équivalent SECURITY DEFINER). Cela by-pass les RLS de logs et
-- utilisateurs pour le caller. Sur Supabase ce comportement remonte dans
-- l'advisor « Security Definer View ».
--
-- security_invoker=on (Postgres 15+) force la vue à appliquer les
-- permissions et les policies RLS de l'utilisateur appelant.
-- L'admin garde l'accès via la policy logs_admin_lecture.
-- =====================================================

CREATE OR REPLACE VIEW vue_logs
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
FROM logs l
LEFT JOIN utilisateurs u ON u.id = l.utilisateur_id
ORDER BY l.horodatage DESC;

GRANT SELECT ON vue_logs TO authenticated;
