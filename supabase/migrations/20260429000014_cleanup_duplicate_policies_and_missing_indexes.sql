-- =====================================================
-- Nettoyage des policies RLS dupliquées + index manquants
-- =====================================================
-- Plusieurs migrations successives ont accumulé des policies RLS
-- strictement redondantes (même rôle, même condition) sur utilisateurs,
-- ateliers et inscriptions. Ce n'était pas une faille (les doublons
-- s'additionnent avec OR, ils ne font que ralentir les requêtes et
-- brouiller la lecture), mais ça complique la maintenance et augmente
-- le risque de dérive future. On garde une seule policy par cas d'usage.
--
-- On ajoute aussi 2 index sur des clés étrangères qui n'en avaient pas,
-- repérés par l'advisor de performance Supabase.
-- =====================================================

-- utilisateurs : utilisateurs_admin_tout est un doublon exact de utilisateurs_admin_all
DROP POLICY IF EXISTS "utilisateurs_admin_tout" ON public.utilisateurs;
-- utilisateurs : "lecture profil personnel" est un doublon de utilisateurs_select_self
DROP POLICY IF EXISTS "lecture profil personnel" ON public.utilisateurs;

-- ateliers : 3 policies admin identiques (is_admin()), on n'en garde qu'une
DROP POLICY IF EXISTS "admin_ateliers" ON public.ateliers;
DROP POLICY IF EXISTS "ateliers_admin" ON public.ateliers;
-- ateliers : lecture_publique_ateliers (statut='publie') est un sous-ensemble
-- strict de ateliers_select_public (statut IN publie/complet/termine)
DROP POLICY IF EXISTS "lecture_publique_ateliers" ON public.ateliers;

-- inscriptions : inscriptions_admin est un doublon exact de inscriptions_admin_all
DROP POLICY IF EXISTS "inscriptions_admin" ON public.inscriptions;

-- Index manquants sur les clés étrangères (perf sur les JOIN / CASCADE)
CREATE INDEX IF NOT EXISTS idx_avis_inscription_id
  ON public.avis (inscription_id);

CREATE INDEX IF NOT EXISTS idx_parametres_messages_modifie_par
  ON public.parametres_messages (modifie_par);
