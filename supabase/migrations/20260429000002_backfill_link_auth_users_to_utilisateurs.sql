-- =====================================================
-- Backfill : lier les comptes auth.users existants à utilisateurs
-- =====================================================
-- Le trigger on_auth_user_created_link_utilisateur (cf.
-- 20260429000001_link_auth_users_to_utilisateurs.sql) ne s'exécute que
-- sur INSERT. Les comptes auth créés *avant* le déploiement du trigger
-- peuvent donc avoir un auth.users.id différent du utilisateurs.id
-- correspondant (même email, ids divergents). Conséquence : la policy
-- "utilisateurs_voir_soi" (auth.uid() = id) renvoie 0 ligne après
-- login → fetchProfile retourne null → l'UI reste bloquée sur le formulaire
-- de connexion jusqu'à ce que le filet de sécurité 6s s'affiche
-- ("Connexion en attente trop longue").
--
-- Ce script aligne, une fois pour toutes, utilisateurs.id sur
-- auth.users.id pour chaque email présent des deux côtés.
-- Idempotent : ne touche que les lignes où les ids divergent.
-- =====================================================

UPDATE public.utilisateurs u
SET    id = a.id
FROM   auth.users a
WHERE  lower(u.email) = lower(a.email)
  AND  u.id <> a.id;
