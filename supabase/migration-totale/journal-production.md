# Déjà fait directement en production (hors paquet de migration)

Ces actions ont été faites sur la base partagée (preview + production) avec l'accord de l'équipe. Elles ne sont
**pas** à rejouer ; elles sont notées pour la traçabilité et pour pouvoir les annuler.

## 27/10/2026

| Action | Détail | Retour arrière |
|---|---|---|
| Migration `20261027000001_types_documents.sql` appliquée par Claude (outil Supabase `execute_sql`, projet CocooningClubBDD) à la demande de l'utilisatrice (« push en prod ») | `ALTER TYPE type_document ADD VALUE` : `interne`, `administratif`, `autre`. Contrôle après : valeurs `magazine, guide, lien_externe, interne, administratif, autre` ; 1 document existant, non modifié. | Bloc « Types de documents » de `retour-arriere.sql` (les documents de ces types repassent en `guide` ; une valeur d'enum ne se retire pas). |
| Migration `20261027000000_hobby_profil.sql` appliquée par Claude (outil Supabase `execute_sql`, projet CocooningClubBDD) avec l'accord de l'utilisatrice | Colonne facultative `utilisateurs.hobby` (TEXT, 200 caractères maximum). Contrôle après : colonne présente, nullable ; aucune donnée touchée. | `ALTER TABLE public.utilisateurs DROP COLUMN hobby;` (déjà dans `retour-arriere.sql`). |

## 26/10/2026

Contrôle en lecture seule de Claude (26/10) : les migrations `20261025000000` et `20261025000001` étaient déjà appliquées (table `pre_inscriptions_secours` avec 2 politiques et RLS, dépôt ouvert aux visiteurs sans lecture, déclencheurs, colonnes `autorisation_image` / `accord_whatsapp` / `consentements_le`, purge à jour). Rien n'a été rejoué.

| Action | Détail | Retour arrière |
|---|---|---|
| Migration `20261026000003_documents_admins.sql` appliquée par Claude (outil Supabase `execute_sql`, projet CocooningClubBDD) à la demande de l'utilisatrice | `ALTER TYPE acces_document ADD VALUE 'admins'` (documents réservés aux administrateurs). Contrôle après : valeurs `membres, tous, admins` ; seule politique de lecture des membres inchangée (`acces IN ('tous','membres')`) ; 1 document existant, non modifié. | Bloc « Documents admins » de `retour-arriere.sql` (les documents `admins` repassent en `membres` ; une valeur d'enum ne se retire pas). |
| Migration `20261026000002_fiche_reliee_au_compte_en_cascade.sql` appliquée par Claude (outil Supabase `execute_sql`, projet CocooningClubBDD) avec l'accord de l'utilisatrice | Les 10 clés étrangères vers `utilisateurs(id)` (adhesions, avis, disponibilites, formateurs, idee_reactions, idees, indisponibilites, inscriptions, logs, parametres_messages) passent en `ON UPDATE CASCADE` ; règles de suppression inchangées. Contrôle après : 10 contraintes validées, `on_update = c`. Aucune donnée touchée. | Bloc « Fiche reliée au compte en cascade » de `retour-arriere.sql`. |
| Suppression du compte `ciritecgrp@gmail.com` par l'utilisatrice (compte de test) | Contrôle de Claude le 26/10 : plus aucun compte de connexion, fiche ni adhésion pour cette adresse ; 5 fiches restantes (les administratrices). | Sans objet. |
| Réparation de la fiche `ciritecgrp@gmail.com` par Claude (outil Supabase `execute_sql`), avec l'accord de l'utilisatrice | « Profil introuvable » à la connexion : la fiche créée via « Ajouter une adhésion » avait un identifiant factice (`3755d52b-…`) alors que le compte de connexion existait depuis avril (`50cdffe5-…`). Identifiant de la fiche et `adhesions.utilisateur_id` alignés sur `50cdffe5-…` en une requête ; contrôle : fiche et compte liés, 1 adhésion, rôle membre. Date de naissance de l'adhésion remise à vide (la valeur 2026-10-26 était la date du jour, saisie par erreur). | Sans objet (remettre l'ancien identifiant ne servirait à rien). |
| Migration `20261026000001_date_naissance_adhesion.sql` appliquée par Claude (outil Supabase `execute_sql`, projet CocooningClubBDD) avec l'accord de l'utilisatrice | Colonne facultative `adhesions.date_naissance` (DATE, contrainte 1900-2100). Contrôle après : colonne et contrainte présentes, 0 adhésion en base, aucune donnée touchée. | `ALTER TABLE public.adhesions DROP COLUMN date_naissance;` (déjà dans `retour-arriere.sql`). |
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
