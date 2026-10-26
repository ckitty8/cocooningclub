# Déjà fait directement en production (hors paquet de migration)

Ces actions ont été faites sur la base partagée (preview + production) avec l'accord de l'équipe. Elles ne sont
**pas** à rejouer ; elles sont notées pour la traçabilité et pour pouvoir les annuler.

## 26/10/2026

| Action | Détail | Retour arrière |
|---|---|---|
| Migration `20261026000000_membre_exige_adhesion.sql` appliquée par Claude (outil Supabase, projet CocooningClubBDD) à la demande de l'utilisatrice | Déclencheur `trg_utilisateurs_membre_exige_adhesion` : pas de rôle `membre` sans adhésion en cours (administrateurs exemptés). Contrôle avant : 0 membre, 5 administratrices. Contrôle après : fonction `private.exiger_adhesion_pour_membre` (SECURITY DEFINER, fermée à `anon`) et déclencheur actif. | `DROP TRIGGER trg_utilisateurs_membre_exige_adhesion ON public.utilisateurs; DROP FUNCTION private.exiger_adhesion_pour_membre();` (déjà dans `retour-arriere.sql`). |

## 25/10/2026

| Action | Détail | Retour arrière |
|---|---|---|
| `migration-totale.sql` puis `migration-deploiement.sql` collés dans le SQL Editor | Appliqués par l'équipe ; contrôles lus par Claude le 25/10 : date de naissance des comptes et `antennes` supprimées, `espaces` en place, 3 formules, rôle premium retiré, tables de sauvegarde supprimées, fonction de purge présente. `pg_cron` n'est pas disponible : la purge RGPD et la dépublication des ateliers passés ne sont pas planifiées. | `retour-arriere-deploiement.sql` puis `retour-arriere.sql` (la colonne `date_naissance` est recréée vide). |

## 23/10/2026

| Action | Détail | Retour arrière |
|---|---|---|
| Migration `20261023000001_corrige_inscription_tardive.sql` | Correctif : toutes les pré-inscriptions échouaient (`private.is_admin()` absent en production). | Remettre l'ancienne fonction (non souhaitable). |
| Titres des 8 ateliers | Retrait du préfixe « Cocoon » : `Cocoon Papotages - Human design` → `Papotages - Human design`, `Cocoon Papotages - Animal Totem`, `Cocoon Papotages - Méthode DISC`, `Cocoon Papotages - Nos traditions de fin d'année`, `Cocoon créatif - Bingo des objectifs` → `Créatif - Bingo des objectifs`, `Cocoon créatif - Atelier floral automnal`, `Cocoon créatif - Calendrier de l'avent`, `Cocoon créatif - Cuisine de Noël` (même principe). | Remettre « Cocoon » devant chaque titre (« Cocoon créatif - … » avec c minuscule). |
| Places de « Créatif - Atelier floral automnal » | `places_disponibles` remis à 20 (capacité 20, aucune inscription) : l'ancienne valeur 10 faisait afficher 10 inscrits fictifs. | Sans objet. |

## État de la base relevé le 23/10/2026 (pour mémoire)

- `utilisateurs` : 5 administratrices actives, aucun membre ni inscrit.
- `ateliers` : 8 (3 terminés, 5 publiés), aucun payant, aucun lien PayPal ; `inscriptions` : 0 ; `transactions_paypal` : 0.
- Compte `ciritecgrp@gmail.com` : existe dans `auth.users`, sans fiche `utilisateurs` (donc aucun accès au site).
