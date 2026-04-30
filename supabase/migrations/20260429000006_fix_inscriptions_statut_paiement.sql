-- =====================================================
-- Backfill : aligner inscriptions.statut_paiement sur le tarif de l'atelier
-- =====================================================
-- Bug : la création manuelle d'inscription via /admin/pre-inscriptions
-- forçait statut_paiement = 'non_requis' quel que soit le tarif de
-- l'atelier. Les inscriptions sur ateliers payants apparaissaient donc
-- "Gratuit" dans le panneau "Inscrits" alors qu'elles auraient dû être
-- "En attente de paiement".
--
-- Ce script remet le bon statut sur les inscriptions existantes :
--   - tarif_standard > 0 ET statut_paiement = non_requis → en_attente
-- (on ne touche pas les 'paye' déjà encaissés ni les 'en_attente'
-- correctement positionnés)
-- =====================================================

UPDATE public.inscriptions i
SET    statut_paiement = 'en_attente'
FROM   public.ateliers a
WHERE  i.atelier_id = a.id
  AND  i.statut_paiement = 'non_requis'
  AND  a.tarif_standard IS NOT NULL
  AND  a.tarif_standard > 0;
