# Checklist fonctionnelle de la migration totale

Cochez au fur et à mesure. « Preview » = la preview Vercel (même base que la production).
Comptes utiles : une administratrice, une membre, une inscrite (rôle `inscrit`), un compte créateur, et une navigation privée pour le visiteur.

## Avant

- [ ] `npm run migration:verifier`, `tsc`, `npm run lint`, `npm test`, `npm run test:e2e` : tout est vert.
- [ ] La preview affiche le dernier commit et fonctionne.
- [ ] Sauvegarde faite. Relevé de départ : nombre de comptes par rôle (`select role, count(*) from utilisateurs group by 1`).
- [ ] Contenu à valider par l'équipe avant la mise en ligne : textes « annulation / remboursement » des CGU, mentions légales (page encore à créer), photos provisoires de l'accueil et de « Notre histoire ».

## Base de données (voir README)

- [ ] `migration-totale.sql` exécuté sans erreur.
- [ ] `verifications.sql` : `=> TOUT EST OK` = `true`.
- [ ] Rien n'a changé pour le visiteur : le site actuel fonctionne toujours (accueil, calendrier, pré-inscription).

## Après : visiteur (navigation privée)

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
- [ ] **Membres** : colonne naissance et colonne **Consentement** (Oui / Non / Non renseigné) ; suppression d'un membre de test : sa fiche **et** son compte de connexion disparaissent (`auth.users`).
- [ ] **Gestion des dispo des admins** : congés, jours fériés, vacances, anniversaires dans le calendrier.
- [ ] **Offre & adhésions** : les 3 formules (100 / 80 / 150 €) s'affichent ; créer, modifier, dupliquer, activer / désactiver une formule ; ajouter une adhésion (bulletin saisi : engagement, WhatsApp, consentement photo et supports) ; la valider : numéro, date de fin = validation + durée, la personne passe de `inscrit` à `membre` ; refuser une adhésion ; modifier le bulletin (retrait de consentement).
- [ ] **Droits par offre** : avec un compte de test, adhésion Créatif validée → Papotages « Gratuit pour tous », atelier Créatifs « Inclus dans votre adhésion », atelier Business « 25 € à régler » ; adhésion Complet → tout inclus ; sans adhésion → seul Papotages est gratuit. La pré-inscription à un atelier inclus a un paiement « non requis », à un atelier à régler « en attente » (page Pré-inscriptions : étiquette Inclus / À régler, avertissement à la validation d'un atelier non réglé). Colonne et filtre « Offre en cours » dans Membres. Comparer avec le simulateur du créateur (« Adhérente Créatif »…) et la page « Droits par offre ».
- [ ] **Deux tarifs** : dans Ateliers, le formulaire a « Tarif non-adhérente » et « Tarif adhérente » (vide = même prix). Un atelier Business à 25 € / 18 € : une non-adhérente voit « 25 € à régler · 18 € avec une adhésion », une adhérente Créatif voit « 18 € à régler », une adhérente Business voit « Inclus dans votre adhésion ». Tarif adhérente à 0 : gratuit pour les adhérentes seulement. La pré-inscription enregistre le paiement « non requis » si gratuit ou inclus, « en attente » sinon.
- [ ] **Blocage des validations impayées** : dans Pré-inscriptions, valider une inscription dont le paiement est « En attente » ouvre la fenêtre « Valider sans paiement » (motif obligatoire) ; après validation, l'action `inscription.validate_sans_paiement` et le motif apparaissent dans le journal. Valider une inscription « Payé » ou « Non requis » reste en un clic. Une inscription créée à la main en « Confirmée » + paiement « En attente » est refusée.
- [ ] Après validation, la personne voit « Mon adhésion » et le consentement correct chez les admins (Membres, Inscrits, Pré-inscriptions).
- [ ] Boîte à idées : idées avec prénom de l'auteur ; Témoignages, Documents, Formulaire de contact, Modèles de messages : aucune régression.

## Après : créateur (`christellelab@gmail.com`)

- [ ] Espace créateur : simulateur de rôle (Inscrit, Membre, Administrateur) et matrice des rôles à jour (ligne « Offre & adhésions », « Mon adhésion »).

## Sécurité (à vérifier à la main)

- [ ] Une membre ne peut pas ouvrir `/admin/...` ; une inscrite ne peut pas ouvrir `/espace-membre/...`.
- [ ] En navigation privée, aucune donnée d'adhésion n'est lisible (les formules actives, elles, sont publiques : c'est voulu).

## Étape finale (irréversible)

- [ ] Tout ce qui précède est validé, puis `supabase/manuel/20261023_supprimer_ciritecgrp.sql` : les contrôles « Après » renvoient 0 partout.

## Pas encore dans cette mise en production

- [ ] Paiement de la cotisation par HelloAsso (le bulletin reste imprimé, rempli sur papier et saisi par une admin), retrait de PayPal (champ `lien_paypal`, table `transactions_paypal`, CGU art. 4), mentions légales, bannière cookie et GA4, import du bulletin signé (PDF scanné).
