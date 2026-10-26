# Checklist fonctionnelle de la migration totale

Cochez au fur et à mesure. « Preview » = la preview Vercel (même base que la production).
Comptes utiles : une administratrice, une membre, une inscrite (rôle `inscrit`), un compte créateur, et une navigation privée pour le visiteur.

## Avant

- [ ] `npm run migration:verifier`, `tsc`, `npm run lint`, `npm test`, `npm run test:e2e` : tout est vert.
- [ ] La preview affiche le dernier commit et fonctionne.
- [ ] Sauvegarde faite. Relevé de départ : nombre de comptes par rôle (`select role, count(*) from utilisateurs group by 1`).
- [ ] Contenu à valider par l'équipe avant la mise en ligne : textes « annulation / remboursement » des CGU, mentions légales (page encore à créer), photos provisoires de l'accueil et de « Notre histoire ».

## Base de données (voir README)

- [ ] `verifier-avant.sql` : aucune ligne `A REGLER`.
- [ ] Durées de conservation validées par l'équipe (visites 13 mois, journal 12 mois, messages de contact 3 ans, invités anonymisés 3 ans après l'atelier, date de naissance d'une pré-inscription effacée 30 jours après l'atelier) : `/confidentialite` les annonce déjà.
- [ ] `migration-totale.sql` exécuté sans erreur.
- [ ] `verifications.sql` : `=> TOUT EST OK` = `true`.
- [ ] Rien n'a changé pour le visiteur : le site actuel fonctionne toujours (accueil, calendrier, pré-inscription).
- [ ] pg_cron actif (Database > Extensions) : sinon l'activer puis relancer le dernier bloc `DO` de `20261024000001_conservation_des_donnees.sql` (planification de la purge et de la dépublication).

## Au déploiement du site (renommages : l'ancien code n'y survit pas)

- [ ] Le site (cette branche) est déployé, **puis aussitôt** `migration-deploiement.sql` exécuté sans erreur.
- [ ] `verifications-deploiement.sql` : `=> TOUT EST OK` = `true`.
- [ ] Admin → Ateliers : la liste, le filtre par espace, la création d'un atelier (menu « Espace ») et la fiche d'un atelier fonctionnent ; l'accueil et le calendrier affichent les logos des espaces.
- [ ] Offre & adhésions : les formules affichent leurs espaces ; pré-inscription à un atelier inclus / à régler : le paiement se calcule toujours (fonction `atelier_inclus`).
- [ ] Mon compte (membre et admin) : l'enregistrement fonctionne (plus de date de naissance) ; Membres : création et modification d'un membre sans date de naissance.

## Après : visiteur (navigation privée)

- [ ] **Lien d'inscription** : sur un atelier (Admin → Ateliers, bouton « Copier le lien d'inscription »), coller le lien dans un navigateur privé : la page affiche l'atelier et le formulaire ; une pré-inscription de test apparaît dans Pré-inscriptions.
- [ ] **Formulaire de pré-inscription** : champs Atelier, Nom, Prénom, E-mail, Téléphone (tous obligatoires), « Droit à l'image » (J'autorise / Je n'autorise pas) et « Groupe WhatsApp » (J'accepte / Je n'accepte pas) : une réponse est obligatoire pour chacun et une seule case peut être cochée ; bloc « Paiement » et case CGU ; après l'envoi, message « Merci pour ton inscription 💛 ». Dans Admin → Pré-inscriptions → fenêtre d'une demande, onglet Infos : « Droit à l'image » et « Groupe WhatsApp » affichés (« Non renseigné » pour les anciennes demandes).
- [ ] **Filet de sécurité** : une pré-inscription ne se perd jamais. Si l'enregistrement normal échoue, la demande apparaît dans le bandeau « Demandes à récupérer » de Pré-inscriptions (bouton « Traitée » pour la retirer) ; si même cela échoue, elle est gardée dans le navigateur et renvoyée au prochain chargement du site.

- [ ] Accueil, « Notre histoire », calendrier (filtres, « Ajouter à mon agenda » télécharge un fichier `.ics`).
- [ ] Pré-inscription à un atelier : champs obligatoires, case CGU obligatoire, message « Pré-inscription enregistrée ».
- [ ] Pages `/cgu`, `/confidentialite`, 404 sur une adresse inconnue, connexion, mot de passe oublié.
- [ ] `/admin/offre` et `/espace-membre` renvoient vers la connexion.

## Après : inscrite (rôle `inscrit`)

- [ ] Elle se pré-inscrit depuis le site : son nom et son e-mail sont préremplis et non modifiables.
- [ ] Après connexion elle arrive sur le calendrier ; `/espace-membre` la ramène à l'accueil (pas d'espace membre).

## Après : membre

- [ ] Espace membre au design du site : tableau de bord, ateliers, mes inscriptions, documents, boîte à idées, mon compte.
- [ ] Pré-inscription depuis « Ateliers » ; elle apparaît chez les admins avec la bonne identité.
- [ ] **Mon adhésion** : récapitulatif (formule, numéro, dates, coordonnées, engagements, consentement Oui/Non) et onglet « Mon bulletin » (recto et verso, impression / PDF).
- [ ] Sans adhésion enregistrée : message « Aucun bulletin d'adhésion enregistré ».
- [ ] Elle ne voit que **son** bulletin.

## Après : administratrice

- [ ] **Ateliers** : chiffres clés ; bascule Cartes / Liste / Calendrier (le choix est retenu) ; recherche + filtres espace et statut. Calendrier : un atelier à sa date, « Créer un atelier ce jour-là » préremplit la date. Nouvel atelier : l'heure de fin se calcule (début + durée). Modifier la capacité recalcule les places libres (jamais d'inscrits fictifs). Le bouton « Inscrits » ouvre les pré-inscriptions de l'atelier ; le titre ouvre sa fiche.
- [ ] **Fiche d'un atelier** (`/admin/ateliers/<id>`) : places prises, validées, à traiter, encaissé ; onglet Inscrites (paiement, présence, consentement, export CSV) et onglet Infos ; « Modifier » rouvre le formulaire.
- [ ] **Pré-inscriptions** : accordéon par atelier (ceux avec des demandes à traiter sont ouverts) ; arrivée depuis « Inscrits » : atelier ouvert + bandeau + « Tout afficher » ; ✓ / ✕ en un clic ; fenêtre à onglets (Infos, Paiement, Messages mail / WhatsApp avec modèle modifiable, Historique) ; « Valider et envoyer » ; flèches personne précédente / suivante ; consentement affiché.
- [ ] **Membres** : colonne **Consentement** (plus de colonne « Naissance » : la date de naissance n'est plus gardée sur les comptes) (Oui / Non / Non renseigné) ; suppression d'un membre de test : sa fiche **et** son compte de connexion disparaissent (`auth.users`).
- [ ] **Gestion des dispo des admins** : congés, jours fériés et vacances dans le calendrier (plus d'anniversaires).
- [ ] **Offre & adhésions** : les 3 formules (100 / 80 / 150 €) s'affichent ; créer, modifier, dupliquer, activer / désactiver une formule ; ajouter une adhésion (bulletin saisi : engagement, WhatsApp, consentement photo et supports) ; la valider : numéro, date de fin = validation + durée, la personne passe de `inscrit` à `membre` ; refuser une adhésion ; modifier le bulletin (retrait de consentement).
- [ ] **Pas de membre sans adhésion** : dans Membres, « Ajouter un membre » ne propose plus le rôle « Membre » (Inscrit ou Administrateur) et la fiche d'une inscrite non plus (le texte dit de passer par « Offre & adhésions ») ; la fiche d'une personne déjà membre garde son rôle et reste modifiable (téléphone…) ; l'administrateur n'a besoin d'aucune adhésion ; valider une adhésion fait toujours passer la personne à « membre » ; en SQL, `update utilisateurs set role = 'membre'` sur une personne sans adhésion en cours échoue (« Le rôle Membre exige une adhésion en cours »). Contrôle : `select email from utilisateurs where role = 'membre' and not exists (select 1 from adhesions a where a.utilisateur_id = utilisateurs.id and a.statut = 'active' and a.valable_jusqu_au >= current_date)` ne renvoie aucune ligne (sinon régulariser ces comptes : saisir leur adhésion).
- [ ] **Droits par offre** : avec un compte de test, adhésion Créatif validée → Papotages « Gratuit pour tous », atelier Créatifs « Inclus dans votre adhésion », atelier Business « 25 € à régler » ; adhésion Complet → tout inclus ; sans adhésion → seul Papotages est gratuit. La pré-inscription à un atelier inclus a un paiement « non requis », à un atelier à régler « en attente » (page Pré-inscriptions : étiquette Inclus / À régler, avertissement à la validation d'un atelier non réglé). Colonne et filtre « Offre en cours » dans Membres. Comparer avec le simulateur du créateur (« Adhérente Créatif »…) et la page « Droits par offre ».
- [ ] **Deux tarifs** : dans Ateliers, le formulaire a « Tarif non-adhérente » et « Tarif adhérente » (vide = même prix). Un atelier Business à 25 € / 18 € : une non-adhérente voit « 25 € à régler · 18 € avec une adhésion », une adhérente Créatif voit « 18 € à régler », une adhérente Business voit « Inclus dans votre adhésion ». Tarif adhérente à 0 : gratuit pour les adhérentes seulement. La pré-inscription enregistre le paiement « non requis » si gratuit ou inclus, « en attente » sinon.
- [ ] **Blocage des validations impayées** : dans Pré-inscriptions, valider une inscription dont le paiement est « En attente » ouvre la fenêtre « Valider sans paiement » (motif obligatoire) ; après validation, l'action `inscription.validate_sans_paiement` et le motif apparaissent dans le journal. Valider une inscription « Payé » ou « Non requis » reste en un clic. Une inscription créée à la main en « Confirmée » + paiement « En attente » est refusée.
- [ ] Après validation, la personne voit « Mon adhésion » et le consentement correct chez les admins (Membres, Inscrits, Pré-inscriptions).
- [ ] Boîte à idées : idées avec prénom de l'auteur ; Témoignages, Documents, Formulaire de contact, Modèles de messages : aucune régression.

- [ ] Les tables `inscriptions_backup_20260430` et `transactions_paypal_backup_20260430` n'existent plus (`verifications.sql`) ; rien d'autre ne change à l'écran.
- [ ] Admin → Ateliers : créer un atelier à une date où aucune administratrice n'est disponible affiche toujours l'avertissement ; un visiteur ne peut pas appeler `admin_dispo_le` (erreur de droits).

## Après : créateur (`christellelab@gmail.com`)

- [ ] Espace créateur : simulateur de rôle (Inscrit, Membre, Administrateur) et matrice des rôles à jour (ligne « Offre & adhésions », « Mon adhésion »).

## Sécurité (à vérifier à la main)

- [ ] Une membre ne peut pas ouvrir `/admin/...` ; une inscrite ne peut pas ouvrir `/espace-membre/...`.
- [ ] En navigation privée, aucune donnée d'adhésion n'est lisible (les formules actives, elles, sont publiques : c'est voulu).

## Étape finale (irréversible)

- [ ] Tout ce qui précède est validé, puis `supabase/manuel/20261023_supprimer_ciritecgrp.sql` : les contrôles « Après » renvoient 0 partout.

## Pas encore dans cette mise en production

- [ ] Paiement de la cotisation par HelloAsso (le bulletin reste imprimé, rempli sur papier et saisi par une admin), retrait de PayPal (champ `lien_paypal`, table `transactions_paypal`, CGU art. 4), mentions légales, bannière cookie et GA4, import du bulletin signé (PDF scanné).
