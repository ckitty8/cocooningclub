// Données partagées entre les générateurs de PDF (REX) et de Word
// (guide utilisateur). Pour chaque écran on décrit :
//   - title / path / section / description : identifiant et contexte
//   - ux / ui : questions du quizz d'audit (utilisé par le REX)
//   - spec : parcours utilisateur au format spécification fonctionnelle
//            (utilisé par le guide utilisateur)

// Pour chaque page, on collecte 4 questions UX (perception, parcours,
// friction, jobs-to-be-done) et 4 critiques UI (typographie, couleur,
// composants, espacement, microinteractions, accessibilité).
export const PAGES = [
  {
    title: "Accueil",
    path: "/",
    section: "Site public",
    description:
      "Page d'atterrissage publique : promesse, parcours et CTA d'inscription.",
    ux: [
      "La promesse du club est-elle claire en moins de 5 secondes ?",
      "Le CTA principal est-il évident dès l'ouverture ?",
      "La proposition de valeur ressort-elle, sans concurrence interne ?",
      "Les leviers de réassurance (prix, format, qui anime) sont-ils présents ?",
    ],
    ui: [
      "La hiérarchie typographique (H1/H2/corps) est-elle nette ?",
      "La palette de couleurs est-elle restreinte et cohérente ?",
      "Les boutons primaire / secondaire sont-ils différenciés ?",
      "Les visuels sont-ils cohérents en style et en ratio ?",
    ],
    spec: {
      acteur: "Visiteuse non authentifiée (curieuse, prospect, ancienne membre revenue).",
      objectif:
        "Comprendre l'offre du Cocooning Club et déclencher une première action (réserver un atelier, se renseigner, créer un compte).",
      preconditions: [
        "Aucune session active dans le navigateur.",
        "Arrivée depuis un canal externe (réseaux sociaux, bouche-à-oreille, recherche Google).",
      ],
      parcoursNominal: [
        "Consulte le hero (titre, sous-titre, visuel) pour saisir la promesse en moins de 5 secondes.",
        "Scrolle pour découvrir présentation, ateliers à venir, témoignages, FAQ.",
        "Identifie un atelier intéressant ou le CTA principal (« Voir les ateliers » / « S'inscrire »).",
        "Clique sur le CTA → redirection vers /calendrier ou /login selon le contexte.",
      ],
      parcoursAlternatifs: [
        "Membre déjà inscrite → clique « Connexion » dans le header → /login.",
        "Souhaite contact direct → clique « Contact » → page formulaire.",
        "Pas convaincue → ferme l'onglet (objectif manqué, à instrumenter).",
        "Visite mobile → menu hamburger, layout 1 colonne, hero recadré.",
      ],
      regles: [
        "Page 100 % publique : aucune authentification requise.",
        "Section « Prochains ateliers » : `statut ∈ {publié, complet}` ET `date_atelier ≥ aujourd'hui`.",
        "Visite tracée en arrière-plan dans `visites_site` pour les statistiques du dashboard.",
      ],
      postconditions:
        "Visite enregistrée (`visites_site`) et/ou navigation vers /calendrier, /login ou page contact.",
    },
  },
  {
    title: "Calendrier",
    path: "/calendrier",
    section: "Site public",
    description:
      "Calendrier public des ateliers et événements à venir.",
    ux: [
      "Le format d'affichage correspond-il à vos habitudes ?",
      "Les infos clés (date, places, prix) sont-elles visibles sans cliquer ?",
      "Les filtres répondent-ils à vos vrais critères de tri ?",
      "Les états « complet » ou « fermé » sont-ils clairement signalés ?",
    ],
    ui: [
      "Chaque carte respire-t-elle assez visuellement ?",
      "Les statuts combinent-ils icône + couleur + texte ?",
      "Sait-on au regard ce qui est cliquable ?",
      "Le rendu mobile reste-t-il lisible sur 360 px ?",
    ],
    spec: {
      acteur: "Visiteuse ou membre cherchant un atelier compatible avec ses contraintes.",
      objectif:
        "Trouver un atelier (date, thème, lieu, prix) et déclencher une pré-inscription en moins de 60 secondes.",
      preconditions: [
        "Au moins un atelier publié à venir dans la base.",
        "Connexion réseau active (sinon page de chargement).",
      ],
      parcoursNominal: [
        "Arrive sur /calendrier (depuis / ou la nav).",
        "Scanne la liste des ateliers, triée par date croissante.",
        "Sélectionne un atelier qui correspond à ses contraintes.",
        "Clique « Réserver » → ouverture du formulaire de pré-inscription.",
        "Renseigne nom, prénom, email, téléphone, soumet.",
        "Toast de confirmation + email d'accusé de réception envoyé.",
      ],
      parcoursAlternatifs: [
        "Atelier complet → bouton désactivé ou option « Liste d'attente ».",
        "Aucun atelier publié → empty state guidant vers une autre action.",
        "Email déjà inscrit pour le même atelier → message de doublon.",
        "Erreur réseau au submit → toast d'erreur + retry.",
      ],
      regles: [
        "Pré-inscription = ligne dans `inscriptions`, statut initial `en_attente`.",
        "`places_disponibles` décrémenté seulement à la confirmation par l'admin.",
        "Email automatique envoyé via le template `email_confirmation_inscription`.",
        "Couple (email_invite, atelier_id) : unique pour éviter les doublons.",
      ],
      postconditions:
        "Inscription `en_attente` créée, badge mis à jour côté admin, accusé de réception envoyé.",
    },
  },
  {
    title: "Connexion",
    path: "/login",
    section: "Authentification",
    description:
      "Page de connexion à l'espace membre / admin.",
    ux: [
      "Sait-on immédiatement où on entre (membre ou admin) ?",
      "Le message d'erreur attendu est-il rassurant ?",
      "Le lien « mot de passe oublié » est-il visible sans crier ?",
      "Manque-t-il « rester connectée » ou un magic link ?",
    ],
    ui: [
      "Les labels sont-ils au-dessus des champs (pas seulement placeholder) ?",
      "Le bouton « afficher mot de passe » est-il accessible et clair ?",
      "L'état « connexion en cours » est-il visible (bouton + spinner) ?",
      "Le poids visuel primaire vs lien est-il équilibré ?",
    ],
    spec: {
      acteur: "Membre, candidate validée, ou administratrice possédant un compte.",
      objectif: "Accéder à son espace personnel ou à l'espace admin.",
      preconditions: [
        "Compte existant et actif dans `utilisateurs` (`est_actif = true`).",
        "Aucune session valide actuellement (sinon redirection auto).",
      ],
      parcoursNominal: [
        "Arrive sur /login (depuis le header, un email, ou une page protégée).",
        "Saisit email + mot de passe.",
        "Soumet → appel `supabase.auth.signInWithPassword`.",
        "Récupération du profil métier dans `utilisateurs` via l'id de session.",
        "Redirection conditionnelle : si `role = administrateur` → /admin/dashboard, sinon → /espace-membre.",
      ],
      parcoursAlternatifs: [
        "Mauvais identifiants → toast « Email ou mot de passe incorrect » (générique, anti-énumération).",
        "Compte désactivé (`est_actif = false`) → redirection /login?inactive=true avec bannière.",
        "Mot de passe oublié → clic « Mot de passe oublié ? » → /forgot-password.",
        "Session déjà active → redirection automatique vers le bon espace au mount.",
      ],
      regles: [
        "Authentification : Supabase Auth (email + mot de passe).",
        "Le rôle est lu depuis la table `utilisateurs`, pas depuis le JWT (source unique de vérité).",
        "Un compte inactif ne peut pas se connecter (bannière dédiée).",
        "Le bouton de soumission est désactivé pendant la requête pour éviter les double-soumissions.",
      ],
      postconditions:
        "Session active, profil chargé en contexte React, navigation vers le bon espace selon le rôle.",
    },
  },
  {
    title: "Mot de passe oublié",
    path: "/forgot-password",
    section: "Authentification",
    description:
      "Demande d'envoi d'un email de réinitialisation.",
    ux: [
      "Le texte rassure-t-il sur l'aboutissement de la procédure ?",
      "Le délai d'attente de l'email est-il précisé ?",
      "Une issue de secours est-elle proposée si rien n'arrive ?",
      "Le retour vers la connexion est-il visible sans distraire ?",
    ],
    ui: [
      "Un seul champ, un seul bouton : page minimaliste ?",
      "Le feedback succès / erreur est-il clair et accessible ?",
      "Le rythme typographique est-il cohérent avec /login ?",
      "Le bouton reste-t-il accessible avec le clavier ouvert (mobile) ?",
    ],
    spec: {
      acteur: "Utilisatrice ne se souvenant plus de son mot de passe.",
      objectif: "Recevoir un lien de réinitialisation par email pour reprendre la main sur son compte.",
      preconditions: [
        "Email correspondant à un compte existant (mais l'utilisatrice ne le sait pas forcément).",
      ],
      parcoursNominal: [
        "Clique sur « Mot de passe oublié ? » depuis /login.",
        "Saisit son email.",
        "Soumet → appel `supabase.auth.resetPasswordForEmail`.",
        "Voit un message générique de confirmation (sans révéler si l'email existe).",
        "Reçoit un email avec un lien magique vers /reset-password?token=...",
      ],
      parcoursAlternatifs: [
        "Email inconnu → même message générique (anti-énumération).",
        "Email arrive dans les spams → consigne explicite « vérifiez vos spams ».",
        "Erreur SMTP côté Supabase → toast d'erreur générique.",
        "Renvoi du lien → bouton réactivable au bout de 60 secondes (anti-spam).",
      ],
      regles: [
        "Lien de réinitialisation valable 1 heure (config Supabase Auth).",
        "Aucun retour explicite sur l'existence du compte (RGPD + sécurité).",
        "Anti-bruteforce : limitation par IP / email côté Supabase.",
      ],
      postconditions:
        "Email envoyé via Supabase Auth, ligne d'audit côté Supabase, retour au /login si l'utilisatrice clique « Retour ».",
    },
  },
  {
    title: "Réinitialisation du mot de passe",
    path: "/reset-password",
    section: "Authentification",
    description:
      "Saisie du nouveau mot de passe (lien reçu par email).",
    ux: [
      "Les contraintes du mot de passe sont-elles affichées avant la saisie ?",
      "Une confirmation (2 champs) réduit-elle le risque de typo ?",
      "Un indicateur de force aide-t-il sans stresser ?",
      "La sortie de tunnel après succès est-elle évidente ?",
    ],
    ui: [
      "Le bouton « œil » est-il accessible au clavier (focus visible) ?",
      "La couleur d'erreur respecte-t-elle le contraste accessible ?",
      "Le bouton primaire est-il désactivé tant que les règles ne passent pas ?",
      "L'attribut autocomplete=new-password est-il bien réglé ?",
    ],
    spec: {
      acteur: "Utilisatrice ayant cliqué sur le lien magique reçu par email.",
      objectif: "Définir un nouveau mot de passe et reprendre l'usage normal du compte.",
      preconditions: [
        "Lien magique valide et non expiré (token Supabase Auth, validité 1h).",
        "Session temporaire en cours (gérée par Supabase Auth via le lien).",
      ],
      parcoursNominal: [
        "Clique sur le lien dans l'email reçu.",
        "Atterrit sur /reset-password avec une session temporaire.",
        "Saisit le nouveau mot de passe + confirmation.",
        "Soumet → appel `supabase.auth.updateUser({ password })`.",
        "Redirection automatique vers /login avec toast « Mot de passe mis à jour ».",
      ],
      parcoursAlternatifs: [
        "Mot de passe ne respecte pas les contraintes → erreur en ligne sous le champ.",
        "Confirmation différente → message d'erreur immédiat.",
        "Token expiré → page d'erreur + CTA pour redemander un lien (/forgot-password).",
        "Connexion interrompue au submit → conservation des champs + retry possible.",
      ],
      regles: [
        "Mot de passe : longueur minimale 8 caractères (config Supabase).",
        "Le lien est utilisable une seule fois (consommé au premier submit).",
        "L'ancienne session (sur d'autres appareils) n'est PAS invalidée par défaut — à confirmer.",
      ],
      postconditions:
        "Mot de passe mis à jour dans Supabase Auth, redirection /login, l'utilisatrice peut se reconnecter avec les nouveaux identifiants.",
    },
  },
  {
    title: "Page introuvable (404)",
    path: "/route-inexistante-test",
    section: "Site public",
    description:
      "Page 404 affichée pour une URL inconnue.",
    ux: [
      "Le ton déculpabilise-t-il l'utilisatrice ?",
      "Au moins 3 voies de rattrapage sont-elles offertes ?",
      "La page exprime-t-elle l'identité « cocooning » ?",
      "L'URL erronée est-elle rappelée pour le diagnostic ?",
    ],
    ui: [
      "Le header / footer du site reste-t-il présent ?",
      "L'illustration s'inscrit-elle dans la palette ?",
      "La hiérarchie « titre humain » avant « 404 » est-elle juste ?",
      "Les balises <title> et <main> sont-elles correctes ?",
    ],
    spec: {
      acteur: "Toute personne arrivant sur une URL inexistante (lien cassé, faute de frappe, ancienne URL).",
      objectif: "Comprendre l'erreur sans frustration et reprendre un parcours utile.",
      preconditions: [
        "URL ne correspondant à aucune route déclarée dans le routeur React.",
      ],
      parcoursNominal: [
        "Arrive sur une URL inexistante (ex. /atelier-supprime).",
        "Voit un message empathique aligné avec l'identité « cocooning ».",
        "Choisit une voie de rattrapage : Accueil, Calendrier, Contact.",
        "Clique → reprise du parcours sur une page valide.",
      ],
      parcoursAlternatifs: [
        "Souhaite chercher → aucun champ recherche disponible (limite actuelle).",
        "Reload → reste sur 404 (URL identique).",
        "Vient via un partage de lien obsolète → idéalement le 404 indique « cette ressource n'existe plus ».",
      ],
      regles: [
        "SPA : statut HTTP 200 mais affichage 404 côté client (à mitiger via meta noindex).",
        "Header et footer du site doivent rester présents pour conserver les chemins de retour.",
        "L'URL incorrecte est rappelée pour aider au diagnostic (`window.location.pathname`).",
      ],
      postconditions:
        "L'utilisatrice repart vers une page valide OU quitte (objectif manqué, à instrumenter via analytics).",
    },
  },
  {
    title: "Admin · Dashboard",
    path: "/admin/dashboard",
    section: "Espace administrateur (accès restreint)",
    description:
      "Vue d'ensemble : indicateurs clés et raccourcis administrateur.",
    ux: [
      "Les 3 infos clés du jour sont-elles visibles sans scroller ?",
      "L'action la plus fréquente est-elle accessible en 1 clic ?",
      "Tous les indicateurs affichés sont-ils actionnables ?",
      "Les chiffres sont-ils explicitement datés (semaine, mois) ?",
    ],
    ui: [
      "Hiérarchie KPI : chiffre dominant > label > tendance ?",
      "Couleur sémantique (vert / rouge) réservée aux variations ?",
      "La densité d'information reste-t-elle gérable ?",
      "Sidebar claire (icône + label + état actif) ?",
    ],
    spec: {
      acteur: "Administratrice du club (rôle = `administrateur`, compte actif).",
      objectif:
        "Vue d'ensemble de l'état du club et accès rapide aux actions prioritaires de la journée.",
      preconditions: [
        "Session admin active (`profile.role = administrateur` et `est_actif = true`).",
        "Connexion réseau active.",
      ],
      parcoursNominal: [
        "Se connecte (/login) ou arrive depuis le menu latéral.",
        "RoleGuard valide les permissions → spinner pendant le chargement du profil.",
        "Charge en parallèle 9 requêtes : KPI, prochains ateliers, pré-inscriptions, idées récentes, admins, stats visites.",
        "Identifie l'action à traiter en priorité (badge sur « À valider », message non lu, atelier à publier).",
        "Clique sur la carte KPI ou la ligne → navigation vers la sous-page correspondante.",
      ],
      parcoursAlternatifs: [
        "KPI à 0 → empty state explicite (« tout est à jour »).",
        "Erreur de chargement → message + bouton retry.",
        "Profil non admin → redirection vers / (RoleGuard).",
        "Compte inactif → redirection vers /login?inactive=true.",
      ],
      regles: [
        "Compteurs filtrés côté DB (ex. `inscriptions.statut = en_attente`, `contact_messages.lu = false`).",
        "Stats visites calculées côté client sur les 30 derniers jours pour limiter la charge.",
        "Liste « Prochains ateliers » : 4 lignes max, tri par date croissante.",
        "Liste « Pré-inscriptions à valider » : 5 lignes max, tri par date d'inscription décroissante.",
        "Salutation contextuelle (matin/après-midi/soir) + prénom de l'admin connectée.",
      ],
      postconditions:
        "État du club consulté ; navigation vers /admin/membres, /admin/ateliers, /admin/pre-inscriptions, etc. selon la priorité.",
    },
  },
  {
    title: "Admin · Membres",
    path: "/admin/membres",
    section: "Espace administrateur (accès restreint)",
    description: "Liste des membres : recherche, filtres, fiche.",
    ux: [
      "La recherche couvre-t-elle vos cas (nom, email, atelier) ?",
      "Les filtres principaux sont-ils combinables et persistés ?",
      "Des actions de masse (export, message) sont-elles présentes ?",
      "La fiche membre contient-elle l'essentiel sans surcharge ?",
    ],
    ui: [
      "Alignement tableau (texte gauche, chiffres droite) respecté ?",
      "Pagination ou scroll infini cohérent avec l'usage admin ?",
      "Les avatars / initiales gèrent-ils l'absence de photo ?",
      "Les pastilles de statut sont-elles visuellement distinctes ?",
    ],
    spec: {
      acteur: "Administratrice gérant la base des membres et les comptes utilisateurs.",
      objectif:
        "Consulter, créer, modifier, désactiver ou supprimer un compte membre, et accéder à sa fiche détaillée.",
      preconditions: [
        "Session admin active.",
        "Au moins une ligne dans `utilisateurs`.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/membres depuis le menu.",
        "Voit la liste paginée triée par date d'inscription décroissante.",
        "Filtre par rôle ou statut, recherche par nom/email.",
        "Clique sur un membre → modal d'édition avec ses informations.",
        "Modifie un champ et sauvegarde → `update` sur `utilisateurs` + log d'action.",
        "Toast de confirmation + rafraîchissement de la liste.",
      ],
      parcoursAlternatifs: [
        "Création d'un nouveau membre → bouton « Créer un membre » → modal vierge → insert dans `auth.users` + `utilisateurs`.",
        "Désactivation d'un compte → confirmation modale → `est_actif = false` (le membre ne pourra plus se connecter).",
        "Suppression définitive → modale de confirmation → suppression `utilisateurs` ET `auth.users`.",
        "Recherche sans résultat → empty state.",
      ],
      regles: [
        "3 rôles possibles : `administrateur`, `inscrit`, `membre`.",
        "Création d'un compte = ligne dans Supabase Auth (`auth.users`) + ligne dans `utilisateurs` (profil métier).",
        "Désactivation = `est_actif = false` (réversible, pas de perte de données).",
        "Toutes les actions sensibles (création, suppression, modification de rôle) sont loguées via `logAction`.",
      ],
      postconditions:
        "Modification persistée dans `utilisateurs`, log dans `audit_log`, liste rafraîchie en mémoire.",
    },
  },
  {
    title: "Admin · Ateliers",
    path: "/admin/ateliers",
    section: "Espace administrateur (accès restreint)",
    description: "Création et gestion des ateliers et événements.",
    ux: [
      "Combien d'étapes pour publier un atelier ?",
      "La duplication ou un modèle est-elle disponible ?",
      "Tous les états (brouillon, publié, complet, annulé, passé) visibles ?",
      "Les risques (double saisie, conflit de date) sont-ils prévenus ?",
    ],
    ui: [
      "Les champs du formulaire sont-ils groupés par bloc cohérent ?",
      "Date et heure sont-elles saisissables au clavier ?",
      "« Enregistrer brouillon » et « Publier » sont-ils distincts ?",
      "Les erreurs sont-elles ancrées au champ concerné ?",
    ],
    spec: {
      acteur: "Administratrice planifiant les ateliers et événements du club.",
      objectif:
        "Créer, modifier, dupliquer ou supprimer des ateliers, et suivre la liste des inscrits + leurs présences.",
      preconditions: [
        "Session admin active.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/ateliers, voit la liste des ateliers (tri par date croissante).",
        "Clique « Ajouter » ou « Modifier » sur un atelier existant → modal de formulaire.",
        "Renseigne titre, description, date, heures, lieu, places_max, statut, prix.",
        "Sauvegarde → `insert` ou `update` sur `ateliers` + log d'action.",
        "Pour suivre les inscrits : clic « Inscrits (N) » sur la carte → modal liste.",
        "Marque les présences le jour J (toggle `present` sur chaque inscription).",
      ],
      parcoursAlternatifs: [
        "Conflit de date avec un autre atelier → avertissement (validation manuelle aujourd'hui).",
        "Annulation d'un atelier → statut `annule`, notification automatique aux inscrits.",
        "Atelier passé → statut `passe` (calculé), visible mais non éditable.",
        "Suppression d'un atelier → confirmation + suppression cascade des inscriptions liées.",
      ],
      regles: [
        "5 statuts : `brouillon`, `publie`, `complet`, `annule`, `passe` (le dernier calculé selon la date).",
        "À la création : `places_disponibles = places_max`.",
        "À chaque confirmation d'inscription : `places_disponibles -= 1` ; à 0 → bascule auto en `complet`.",
        "Annulation d'une inscription confirmée : `places_disponibles += 1`.",
      ],
      postconditions:
        "Atelier créé ou modifié dans `ateliers`, visible côté public si statut `publie` ou `complet`, log d'action enregistré.",
    },
  },
  {
    title: "Admin · Pré-inscriptions",
    path: "/admin/pre-inscriptions",
    section: "Espace administrateur (accès restreint)",
    description: "Suivi des pré-inscriptions et confirmations.",
    ux: [
      "Tous les statuts métier sont-ils représentés ?",
      "La priorité de traitement du jour est-elle suggérée ?",
      "Confirmer / refuser / relancer sont-ils accessibles en 1 clic ?",
      "La candidate est-elle automatiquement notifiée ?",
    ],
    ui: [
      "Les colonnes utiles sont-elles lisibles sans scroll horizontal ?",
      "Les actions destructrices sont-elles différenciées ?",
      "L'empty state guide-t-il vers une action utile ?",
      "Un badge sur le menu indique-t-il le nombre en attente ?",
    ],
    spec: {
      acteur:
        "Administratrice traitant les pré-inscriptions reçues via le formulaire public.",
      objectif:
        "Valider, refuser ou annuler les pré-inscriptions, et les transformer en inscriptions confirmées avec notification automatique.",
      preconditions: [
        "Au moins une pré-inscription reçue (ligne `inscriptions` avec `statut = en_attente`).",
        "Templates de messages configurés dans /admin/messages-templates.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/pre-inscriptions (souvent depuis le badge sur le menu).",
        "Voit la liste triée par date d'inscription décroissante avec atelier joint.",
        "Filtre par statut (`en_attente`, `confirme`, `annule`).",
        "Clique « Confirmer » sur une ligne → `statut = confirme`, `places_disponibles -= 1`.",
        "Email automatique envoyé via le template `email_confirmation_inscription` (variables interpolées).",
        "Boucle pour chaque pré-inscription en attente.",
      ],
      parcoursAlternatifs: [
        "Plus de places disponibles → la candidate est mise en file d'attente manuelle ou refusée.",
        "Annulation par la candidate → `statut = annule`, `annule_le` renseigné, place restituée.",
        "Inscription manuelle (l'admin inscrit quelqu'un) → bouton « Ajouter » → formulaire vierge.",
        "Membre déjà connue → pré-remplissage depuis la base `utilisateurs` si `email_invite` matche.",
      ],
      regles: [
        "Confirmation : `inscriptions.statut = confirme` + `ateliers.places_disponibles -= 1`.",
        "Annulation après confirmation : `places_disponibles += 1`.",
        "Email envoyé selon le template correspondant à la transition (confirmation, refus, relance).",
        "Toutes les transitions sont loguées dans `audit_log` via `logAction`.",
      ],
      postconditions:
        "Statut de l'inscription mis à jour, jauge atelier ajustée, email envoyé à la candidate.",
    },
  },
  {
    title: "Admin · Documents",
    path: "/admin/documents",
    section: "Espace administrateur (accès restreint)",
    description: "Bibliothèque de documents partagés avec les membres.",
    ux: [
      "Le modèle d'organisation reflète-t-il vos types réels ?",
      "Les droits d'accès (membres / tous) sont-ils clairs ?",
      "Sait-on si un document est obsolète (date, alerte) ?",
      "Notification membre à l'ajout : utile ou intrusive ?",
    ],
    ui: [
      "Liste vs grille : bascule possible et utile ?",
      "Zone d'upload explicite avec états (hover, progression) ?",
      "Métadonnées (taille, date) lisibles d'un coup d'œil ?",
      "Actions (DL, supprimer) accessibles avec confirmation ?",
    ],
    spec: {
      acteur: "Administratrice gérant la bibliothèque de documents partagée avec les membres.",
      objectif:
        "Publier, modifier ou supprimer des documents (magazines, guides, liens externes) avec un contrôle granulaire des droits d'accès.",
      preconditions: [
        "Session admin active.",
        "Bucket Supabase Storage `documents` configuré (privé, accès via signed URL).",
      ],
      parcoursNominal: [
        "Arrive sur /admin/documents, voit la liste triée par date d'ajout décroissante.",
        "Clique « Ajouter » → modal d'upload.",
        "Choisit le type (`magazine`, `guide`, `lien_externe`), titre, description.",
        "Si type fichier : upload dans le bucket `documents` ; si type lien : saisit l'URL.",
        "Définit l'accès (`membres`, `tous`).",
        "Sauvegarde → ligne dans `documents`, fichier accessible via signed URL.",
      ],
      parcoursAlternatifs: [
        "Modification d'un document existant → modal en édition, ré-upload possible.",
        "Suppression → confirmation modale + suppression du fichier dans Storage + ligne DB.",
        "Prévisualisation → génération d'une signed URL valable 5 minutes.",
        "Erreur d'upload (taille, format) → toast d'erreur explicite.",
      ],
      regles: [
        "Stockage des fichiers : bucket Supabase `documents` privé, accès via signed URL temporaire (5 min).",
        "3 types autorisés : `magazine`, `guide`, `lien_externe` (pas de fichier pour ce dernier).",
        "2 niveaux d'accès : `membres`, `tous`.",
        "Suppression d'un document : on supprime la ligne DB ET le fichier dans Storage.",
      ],
      postconditions:
        "Document disponible côté membre dans son espace selon son rôle, log d'action enregistré.",
    },
  },
  {
    title: "Admin · Formulaire",
    path: "/admin/formulaire",
    section: "Espace administrateur (accès restreint)",
    description: "Configuration du formulaire d'inscription public.",
    ux: [
      "La longueur du formulaire est-elle assumée (filtre fort vs leads) ?",
      "Des champs conditionnels existent-ils ?",
      "Un aperçu en mode visiteur est-il accessible avant publication ?",
      "La sortie (export, base) est-elle fluide ?",
    ],
    ui: [
      "Drag & drop pour réordonner les champs ?",
      "Types de champ (texte, choix, date, RGPD) couvrent-ils les besoins ?",
      "Convention obligatoire vs facultatif visible et cohérente ?",
      "État de publication (brouillon, publié, archivé) distinct ?",
    ],
    spec: {
      acteur: "Administratrice configurant le formulaire de contact public.",
      objectif:
        "Définir les champs visibles, leur libellé, leur ordre et leur caractère obligatoire pour le formulaire affiché côté visiteur.",
      preconditions: [
        "Session admin active.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/formulaire, voit la configuration actuelle (champs visibles, libellés, ordre).",
        "Active / désactive un champ ou modifie son libellé.",
        "Réordonne les champs par drag & drop.",
        "Sauvegarde → `update` sur la table `formulaires` + champs.",
        "Toast de confirmation, modification immédiatement visible côté public.",
      ],
      parcoursAlternatifs: [
        "Aperçu en mode visiteur (prévisualisation du rendu public sans publier).",
        "Réinitialisation à la configuration par défaut.",
        "Désactivation totale du formulaire (mode maintenance) → message remplaçant le formulaire côté public.",
        "Export des messages reçus en CSV.",
      ],
      regles: [
        "Les champs `nom` et `email` sont obligatoires et non désactivables (validation côté DB).",
        "Modifications appliquées immédiatement (pas de versionning, pas de brouillon).",
        "Les soumissions atterrissent dans la table `contact_messages` quel que soit le format du formulaire.",
      ],
      postconditions:
        "Configuration du formulaire mise à jour, visiteurs voient la nouvelle version dès le prochain refresh.",
    },
  },
  {
    title: "Admin · Templates de messages",
    path: "/admin/messages-templates",
    section: "Espace administrateur (accès restreint)",
    description: "Modèles de messages (email / SMS) réutilisables.",
    ux: [
      "Les 3 templates les plus utilisés sont-ils déjà présents ?",
      "Les variables ({{prénom}}, etc.) sont-elles documentées dans l'éditeur ?",
      "La distinction email vs SMS est-elle explicite ?",
      "Un test d'envoi est-il possible avant utilisation ?",
    ],
    ui: [
      "L'éditeur WYSIWYG reste-t-il simple, sans surcharge ?",
      "Un aperçu côte à côte est-il disponible ?",
      "La bibliothèque est-elle triable et recherchable ?",
      "L'historique des modifications est-il accessible ?",
    ],
    spec: {
      acteur: "Administratrice modifiant le contenu des emails / SMS automatiques envoyés par le système.",
      objectif:
        "Personnaliser les messages transactionnels (confirmation, relance, rappel) sans intervention développeur.",
      preconditions: [
        "Session admin active.",
        "Au moins un template prédéfini dans `parametres_messages`.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/messages-templates, voit la liste des templates triés par clé.",
        "Clique sur un template → édition inline du contenu.",
        "Modifie le texte avec variables (`{{prenom}}`, `{{titre_atelier}}`, `{{date_atelier}}`).",
        "Sauvegarde → `update` sur `parametres_messages`.",
        "Toast de confirmation, le template est utilisé pour tous les envois ultérieurs.",
      ],
      parcoursAlternatifs: [
        "Aperçu avec données réelles avant sauvegarde.",
        "Test d'envoi à sa propre adresse pour vérifier le rendu.",
        "Restauration de la version par défaut (pour ne pas casser les automatismes).",
        "Modification accidentelle → confirmation modale si le template est critique.",
      ],
      regles: [
        "Variables interpolées au moment de l'envoi par les triggers métier (confirmation, annulation, rappel).",
        "Modification immédiatement effective : tous les emails ultérieurs utilisent la nouvelle version.",
        "Un template ne peut PAS être supprimé (clé prédéfinie) — uniquement vidé / restauré.",
        "Distinction par canal : `email` (HTML, mise en forme riche) vs `sms` (texte court, ≤ 160 caractères).",
      ],
      postconditions:
        "Contenu du template mis à jour ; tous les envois automatiques ultérieurs utilisent la nouvelle version.",
    },
  },
  {
    title: "Admin · Disponibilités",
    path: "/admin/disponibilites",
    section: "Espace administrateur (accès restreint)",
    description: "Gestion des créneaux et disponibilités.",
    ux: [
      "La granularité (créneau, demi-journée) reflète-t-elle votre planification ?",
      "La récurrence couvre-t-elle 80 % des cas ?",
      "Les conflits avec un atelier planifié sont-ils prévenus ?",
      "Sait-on ce qui est exposé publiquement ?",
    ],
    ui: [
      "La vue semaine est-elle claire et lisible ?",
      "Les états (dispo, pris, bloqué) sont-ils visuellement distincts ?",
      "Le drag pour étendre un créneau est-il intuitif ?",
      "La bascule mobile vers une liste est-elle automatique ?",
    ],
    spec: {
      acteur: "Administratrice (animatrice ou co-animatrice) gérant son planning d'animation.",
      objectif:
        "Déclarer ses créneaux récurrents et ses indisponibilités exceptionnelles pour que la création d'ateliers en tienne compte.",
      preconditions: [
        "Session admin active.",
        "Profil de l'admin avec `role = administrateur` et un `couleur_conges` configuré.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/disponibilites, voit la grille hebdomadaire de ses dispos habituelles.",
        "Ajoute un créneau récurrent → modal (jour de la semaine, heure_debut, heure_fin) → `insert` dans `disponibilites`.",
        "Bascule en vue calendrier pour saisir une indisponibilité ponctuelle (vacances, congé).",
        "Saisit motif, date_debut, date_fin → `insert` dans `indisponibilites`.",
        "Toast de confirmation, planning mis à jour.",
      ],
      parcoursAlternatifs: [
        "Conflit avec un atelier déjà planifié → avertissement (pas de blocage).",
        "Suppression d'une indisponibilité → confirmation modale.",
        "Pré-remplissage des vacances scolaires (zone C) depuis `vacances_scolaires` → 1 clic.",
        "Vue jours fériés en lecture seule (depuis `jours_feries`).",
      ],
      regles: [
        "Disponibilités : récurrence hebdomadaire (`jour` 0=dimanche → 6=samedi, `heure_debut`/`heure_fin`).",
        "Indisponibilités : plage `date_debut` → `date_fin` (peut s'étendre sur plusieurs jours).",
        "Affichage avec `code_couleur_conges` du profil pour distinguer plusieurs admins.",
        "Une indisponibilité bloque la création d'ateliers sur la période (à confirmer côté Ateliers).",
      ],
      postconditions:
        "Disponibilités et indisponibilités mises à jour, visibles lors de la création d'ateliers et dans la vue planning.",
    },
  },
  {
    title: "Admin · Boîte à idées",
    path: "/admin/boite-a-idees",
    section: "Espace administrateur (accès restreint)",
    description: "Suivi des suggestions remontées par les membres.",
    ux: [
      "Le cycle de vie d'une idée est-il représenté ?",
      "La boucle de retour à l'autrice est-elle automatique ?",
      "Les autres membres peuvent-elles voir et voter ?",
      "Une idée peut-elle se transformer en atelier ?",
    ],
    ui: [
      "Hiérarchie de carte (titre > description > meta) respectée ?",
      "Le tri / filtre par défaut est-il pertinent ?",
      "La palette des statuts reste-t-elle sobre ?",
      "L'empty state encourage-t-il à inviter des contributions ?",
    ],
    spec: {
      acteur: "Administratrice centralisant les idées remontées par les membres.",
      objectif:
        "Recueillir, classer et prioriser les idées d'ateliers / d'évolutions du site / d'améliorations communautaires.",
      preconditions: [
        "Session admin active.",
        "Au moins une idée déposée dans `idees` (par l'admin ou par une membre).",
      ],
      parcoursNominal: [
        "Arrive sur /admin/boite-a-idees, voit la liste des idées (tri par date de création décroissante).",
        "Filtre par catégorie (`evolution_site`, `ateliers`, `anomalie_site`, `communication`, `evenements`, `organisation`, `membres`, `autre`).",
        "Clique sur une idée → détails complets, auteur, réactions existantes.",
        "Réagit avec « Validé / À discuter / Non validé » → `insert` ou `update` dans `idee_reactions`.",
        "Boucle pour traiter les idées en attente.",
      ],
      parcoursAlternatifs: [
        "Création d'une idée par l'admin elle-même → modal de création.",
        "Modification d'une idée existante : titre, description, catégorie.",
        "Suppression d'une idée → confirmation modale (irréversible, supprime aussi les réactions liées).",
        "Plusieurs admins co-réagissent → chaque admin voit ses propres réactions distinguées par couleur.",
      ],
      regles: [
        "8 catégories prédéfinies (`evolution_site`, `ateliers`, `anomalie_site`, `membres`, `communication`, `evenements`, `organisation`, `autre`).",
        "3 réactions admin possibles : `valide`, `non_valide`, `a_discuter`.",
        "Une admin = 1 seule réaction par idée (update si elle change d'avis).",
        "Suppression d'une idée → cascade sur `idee_reactions` (FK avec `on delete cascade`).",
      ],
      postconditions:
        "Réaction enregistrée, statut visuel mis à jour pour les autres admins, auteur de l'idée éventuellement notifié (selon config).",
    },
  },
  {
    title: "Admin · Avis & témoignages",
    path: "/admin/avis",
    section: "Espace administrateur (accès restreint)",
    description:
      "Modération des avis laissés par les membres après un atelier : approuver, rejeter, mettre en avant.",
    ux: [
      "Le format de modération vous fait-il gagner du temps ?",
      "Les critères de décision (note, vocabulaire) sont-ils visibles ?",
      "L'autrice de l'avis est-elle informée du résultat ?",
      "La mise en avant suit-elle une règle claire ?",
    ],
    ui: [
      "La note (étoiles + chiffre) est-elle lisible immédiatement ?",
      "Les badges de statut sont-ils visuellement distincts ?",
      "Les actions inline (approuver, rejeter) sont-elles accessibles ?",
      "La densité reste-t-elle scannable sur 20+ avis ?",
    ],
    spec: {
      acteur: "Administratrice modérant les avis publiés par les membres après un atelier.",
      objectif:
        "Approuver, rejeter ou mettre en avant les avis pour alimenter la page d'accueil et garantir la qualité éditoriale.",
      preconditions: [
        "Session admin active.",
        "Au moins un avis publié par une membre dans `avis`.",
        "L'avis est lié à une inscription confirmée pour authentifier l'auteur·rice.",
      ],
      parcoursNominal: [
        "Arrive sur /admin/avis, voit la liste filtrée par défaut sur `en_attente`.",
        "Lit le commentaire et la note (1-5 étoiles).",
        "Décide : « Approuver » → `moderation = approuve` + `modere_le = now()`.",
        "Optionnel : « Mettre en avant » → `mis_en_avant = true` (visible sur la home).",
        "Boucle pour traiter les avis suivants.",
      ],
      parcoursAlternatifs: [
        "Avis irrespectueux ou hors-sujet → « Rejeter » → `moderation = rejete`, l'avis n'apparaît jamais publiquement.",
        "Avis approuvé puis problématique → repasser en `rejete` (réversible).",
        "Avis mis en avant déjà existant → maximum 3 simultanés (à confirmer côté front).",
        "Filtre par note (≥ 4) pour repérer les meilleurs candidats à la mise en avant.",
      ],
      regles: [
        "3 statuts de modération : `en_attente`, `approuve`, `rejete`.",
        "Seuls les avis `approuve` sont visibles côté public ; `mis_en_avant` les remonte sur la home.",
        "L'auteur·rice doit avoir une inscription `confirme` au même atelier pour pouvoir laisser un avis.",
        "Toute transition met à jour `modere_le` (audit) et est loguée via `logAction`.",
      ],
      postconditions:
        "Avis modéré ; visibilité publique ajustée ; auteur·rice notifié·e (selon config), home mise à jour si avis mis en avant.",
    },
  },
  {
    title: "Admin · Mon compte",
    path: "/admin/mon-compte",
    section: "Espace administrateur (accès restreint)",
    description: "Paramètres du compte administrateur.",
    ux: [
      "Quels champs puis-je modifier moi-même sans aide tech ?",
      "Le changement de mot de passe demande-t-il l'ancien ?",
      "Une notion de co-administratrice est-elle anticipée ?",
      "La déconnexion est-elle évidente depuis n'importe où ?",
    ],
    ui: [
      "Sections séparées (info, sécurité, préférences) ?",
      "Les champs read-only sont-ils visuellement distincts ?",
      "« Supprimer le compte » est-il isolé et en couleur tertiaire ?",
      "Le toast de confirmation explicite-t-il QUOI est enregistré ?",
    ],
    spec: {
      acteur: "Administratrice gérant son propre profil et ses paramètres de compte.",
      objectif:
        "Mettre à jour ses informations personnelles, changer son mot de passe / email, gérer son avatar et se déconnecter.",
      preconditions: [
        "Session admin active (l'admin gère son propre compte).",
      ],
      parcoursNominal: [
        "Arrive sur /admin/mon-compte (depuis le menu utilisateur en bas du sidebar).",
        "Voit ses informations actuelles : nom, prénom, email, téléphone, date de naissance, photo, couleur congés.",
        "Modifie un ou plusieurs champs.",
        "Sauvegarde → `update` sur `utilisateurs` (champs métier) + `supabase.auth.updateUser` (email/password).",
        "Toast de confirmation, profil rafraîchi en contexte React.",
      ],
      parcoursAlternatifs: [
        "Upload d'avatar → bucket Supabase Storage `avatars` (5 Mo max, JPG/PNG/WebP).",
        "Changement d'email → email de confirmation envoyé à la nouvelle adresse, double opt-in.",
        "Changement de mot de passe → double saisie + confirmation immédiate.",
        "Déconnexion → bouton « Se déconnecter » → `supabase.auth.signOut` + redirection /login.",
      ],
      regles: [
        "Email modifiable mais nécessite confirmation par lien email (pour éviter la prise de contrôle).",
        "Avatar : 5 Mo max, formats JPG/PNG/WebP, stocké dans bucket public `avatars`.",
        "Mot de passe : longueur minimale 8 caractères (config Supabase).",
        "Le rôle (`administrateur`) n'est PAS modifiable depuis cette page (lecture seule).",
      ],
      postconditions:
        "Profil mis à jour dans `utilisateurs`, éventuel email de confirmation envoyé pour le changement d'email, ancienne session invalidée si mot de passe changé.",
    },
  },
  {
    title: "Membre · Tableau de bord",
    path: "/espace-membre",
    section: "Espace membre (rôles inscrit / membre)",
    description: "Page d'accueil de l'espace membre : prochaines inscriptions, raccourcis, magazine.",
    ux: [
      "La salutation et le contenu sont-ils personnalisés ?",
      "Les 3 actions principales sont-elles à 1 clic ?",
      "L'empty state invite-t-il à découvrir le calendrier ?",
      "Quel élément donne envie de revenir chaque semaine ?",
    ],
    ui: [
      "Le bloc « prochaine inscription » domine-t-il visuellement ?",
      "La sidebar est-elle cohérente avec l'espace admin ?",
      "Le rendu mobile reste-t-il pertinent ?",
      "Les microinteractions s'alignent-elles avec l'identité « cocooning » ?",
    ],
    spec: {
      acteur: "Membre du club (rôle `inscrit`, `membre`, ou `administrateur` en vue test).",
      objectif:
        "Avoir une vue synthétique de son activité au club et accéder rapidement à ses prochains rendez-vous.",
      preconditions: [
        "Session active avec rôle `inscrit`, `membre` ou `administrateur` (RoleGuard).",
      ],
      parcoursNominal: [
        "Se connecte → redirection automatique vers /espace-membre selon le rôle.",
        "Voit prochain atelier inscrit, dernier numéro du magazine, raccourcis principaux.",
        "Clique sur un raccourci → navigue vers /espace-membre/ateliers, /inscriptions ou /magazine.",
      ],
      parcoursAlternatifs: [
        "Aucune inscription en cours → CTA vers /espace-membre/ateliers.",
        "Magazine non encore publié → message d'attente.",
      ],
      regles: [
        "Visibilité réservée aux rôles `inscrit`, `membre`, `administrateur` (RoleGuard).",
        "Données filtrées par RLS (Row Level Security) côté Supabase : la membre ne voit que ses propres inscriptions.",
        "L'admin connectée voit la version de test sans avoir besoin de se créer un faux compte.",
      ],
      postconditions:
        "Membre orientée vers la sous-page utile, ou rassurée sur l'état de ses inscriptions.",
    },
  },
  {
    title: "Membre · Ateliers",
    path: "/espace-membre/ateliers",
    section: "Espace membre (rôles inscrit / membre)",
    description: "Catalogue des ateliers à venir avec inscription en 1 clic depuis l'espace membre.",
    ux: [
      "Qu'apporte cette page de plus que /calendrier public ?",
      "L'inscription est-elle fluide sans re-saisie d'identité ?",
      "Les filtres utiles (thème, jour, animatrice) sont-ils présents ?",
      "Le statut « déjà inscrite » est-il visible immédiatement ?",
    ],
    ui: [
      "Hiérarchie carte : photo, titre, date, places, CTA ?",
      "L'état « inscrite » combine-t-il couleur + texte ?",
      "L'empty state est-il chaleureux ?",
      "Disposition mobile en 1 colonne bien adaptée ?",
    ],
    spec: {
      acteur: "Membre cherchant à s'inscrire à un nouvel atelier.",
      objectif:
        "Découvrir les ateliers disponibles et s'inscrire en 1 clic grâce à sa session membre.",
      preconditions: [
        "Session membre active.",
        "Au moins un atelier publié à venir.",
      ],
      parcoursNominal: [
        "Arrive sur /espace-membre/ateliers depuis le menu.",
        "Voit la liste filtrable des ateliers à venir avec statut d'inscription par carte.",
        "Clique « M'inscrire » → insertion d'une `inscription` au statut `en_attente` (aucun formulaire, données déjà connues).",
        "Toast de confirmation, badge « Inscrite » apparaît instantanément.",
      ],
      parcoursAlternatifs: [
        "Atelier complet → bouton « Liste d'attente » au lieu de « M'inscrire ».",
        "Déjà inscrite → bouton « Se désinscrire » (jusqu'à 24h avant) ou « Voir les détails ».",
        "Erreur réseau → toast d'erreur + retry.",
      ],
      regles: [
        "L'identité (`utilisateur_id`) est dérivée de la session, pas saisie.",
        "Pas de double inscription possible (`unique(utilisateur_id, atelier_id)`).",
        "Tarif affiché : `tarif_standard` (les tarifs admin internes ne sont pas visibles).",
      ],
      postconditions:
        "Inscription créée en `en_attente`, l'admin reçoit la notification ; le statut « Inscrite » est immédiatement visible sur la carte.",
    },
  },
  {
    title: "Membre · Mes inscriptions",
    path: "/espace-membre/inscriptions",
    section: "Espace membre (rôles inscrit / membre)",
    description: "Historique et état des inscriptions de la membre.",
    ux: [
      "La séparation à venir / passées / annulées est-elle claire ?",
      "L'action principale (annuler, facture, avis) est-elle prioritaire ?",
      "Chaque inscription porte-t-elle ses infos clés sans cliquer ?",
      "L'avis est-il proposé uniquement après l'atelier ?",
    ],
    ui: [
      "Les pastilles statut sont-elles visuellement distinctes ?",
      "Le statut paiement combine-t-il couleur + texte ?",
      "L'action « annuler » utilise-t-elle une couleur tertiaire ?",
      "La densité passé / à venir est-elle adaptée ?",
    ],
    spec: {
      acteur: "Membre suivant l'historique de ses inscriptions.",
      objectif:
        "Consulter son agenda personnel des ateliers et gérer ses inscriptions (annulation, avis, factures).",
      preconditions: [
        "Session membre active.",
        "Au moins une inscription dans `inscriptions` filtrée par `utilisateur_id` de la session.",
      ],
      parcoursNominal: [
        "Arrive sur /espace-membre/inscriptions, voit ses inscriptions à venir en haut, passées en bas.",
        "Pour une inscription à venir : peut consulter les détails ou annuler (jusqu'à 24h avant).",
        "Pour une inscription passée : peut laisser un avis, télécharger sa facture (si applicable).",
      ],
      parcoursAlternatifs: [
        "Aucune inscription → empty state avec CTA « Voir les ateliers ».",
        "Annulation hors délai → bouton désactivé + tooltip explicatif (« Délai dépassé, contactez-nous »).",
        "Avis déjà laissé → badge « Avis envoyé », plus de relance.",
      ],
      regles: [
        "Annulation : `statut = annule`, `annule_le = now()`, `places_disponibles += 1` côté atelier.",
        "Délai d'annulation : 24h avant la date_atelier (paramétrable).",
        "Avis : possible uniquement après la date_atelier ET si `statut = confirme` ET si `present = true`.",
        "RLS : `inscriptions.utilisateur_id = auth.uid()` (pas d'accès aux inscriptions des autres).",
      ],
      postconditions:
        "Inscription annulée et place restituée OU avis créé en `en_attente` de modération.",
    },
  },
  {
    title: "Membre · Magazine",
    path: "/espace-membre/magazine",
    section: "Espace membre (rôles inscrit / membre)",
    description: "Lecture du magazine du club : numéros et articles.",
    ux: [
      "Le numéro courant est-il identifiable au premier regard ?",
      "Le confort de lecture (en ligne / téléchargement) est-il assuré ?",
      "Le sommaire est-il scannable ?",
      "Qu'est-ce qui donne envie de revenir chaque mois ?",
    ],
    ui: [
      "La couverture a-t-elle un ratio cohérent et net ?",
      "La typographie de magazine (sérif élégante) est-elle utilisée ?",
      "Le bouton de téléchargement reste-t-il secondaire ?",
      "Le viewer mobile est-il performant ?",
    ],
    spec: {
      acteur: "Membre souhaitant accéder au magazine du club (contenu éditorial).",
      objectif:
        "Lire le numéro courant ou consulter les archives, en ligne ou en téléchargement.",
      preconditions: [
        "Session membre active.",
        "Au moins un fichier magazine déposé dans le bucket Storage `magazines` (ou `documents`).",
      ],
      parcoursNominal: [
        "Arrive sur /espace-membre/magazine, voit la couverture du numéro courant.",
        "Clique « Lire en ligne » → ouverture d'un viewer PDF intégré OU page dédiée.",
        "Optionnel : clique « Télécharger » → PDF téléchargé localement.",
      ],
      parcoursAlternatifs: [
        "Aucun magazine disponible → message « Le prochain numéro arrive bientôt ! ».",
        "Erreur de chargement (signed URL expirée) → retry automatique.",
      ],
      regles: [
        "Stockage : bucket Supabase Storage privé, accès via signed URL.",
        "Aucune analytique de lecture stockée par défaut (à confirmer RGPD).",
      ],
      postconditions:
        "Magazine consulté ou téléchargé, signed URL générée et expirée après 1h.",
    },
  },
  {
    title: "Membre · Mon compte",
    path: "/espace-membre/mon-compte",
    section: "Espace membre (rôles inscrit / membre)",
    description: "Paramètres personnels de la membre : profil, préférences, sécurité.",
    ux: [
      "Les champs modifiables vs read-only sont-ils explicites ?",
      "La sécurité (ancien mot de passe demandé) est-elle assurée ?",
      "La suppression du compte a-t-elle un parcours clair ?",
      "Les préférences de communication sont-elles transparentes ?",
    ],
    ui: [
      "Sections clairement séparées (info, sécurité, préférences) ?",
      "Les champs read-only sont-ils marqués (cadenas, fond grisé) ?",
      "L'action destructrice est-elle isolée et tertiaire ?",
      "Le toast de confirmation explicite-t-il ce qui est enregistré ?",
    ],
    spec: {
      acteur: "Membre gérant son propre profil et ses paramètres de compte.",
      objectif: "Mettre à jour ses informations, gérer son mot de passe, ses préférences et éventuellement supprimer son compte.",
      preconditions: ["Session membre active."],
      parcoursNominal: [
        "Arrive sur /espace-membre/mon-compte (depuis le menu utilisateur).",
        "Modifie ses informations personnelles (téléphone, photo, date de naissance).",
        "Sauvegarde → `update` sur `utilisateurs` filtré par `id = auth.uid()`.",
        "Change son mot de passe via `supabase.auth.updateUser({password})`.",
      ],
      parcoursAlternatifs: [
        "Changement d'email → email de confirmation envoyé à la nouvelle adresse.",
        "Suppression du compte → confirmation modale, anonymisation des inscriptions.",
        "Upload d'avatar → bucket `avatars` (5 Mo max, JPG/PNG/WebP).",
      ],
      regles: [
        "Le rôle (`role`) et le statut (`est_actif`) sont en lecture seule (gérés par l'admin).",
        "RLS : `id = auth.uid()` (la membre ne peut modifier que son propre profil).",
        "Suppression du compte : ligne anonymisée dans `utilisateurs` mais inscriptions historiques préservées.",
      ],
      postconditions:
        "Profil membre mis à jour, éventuelle session invalidée si mot de passe changé.",
    },
  },
];

// Audit transverse final imprimé en clôture du PDF.
export const TRANSVERSE_AUDIT = {
  title: "Audit transverse — heuristiques & système de design",
  blocks: [
    {
      title: "Heuristiques de Nielsen (1-10)",
      items: [
        "Visibilité du statut système — l'utilisateur sait-il toujours ce qui se passe (chargement, succès, erreur) ?",
        "Correspondance avec le monde réel — le vocabulaire est-il celui de l'utilisatrice (« atelier » plutôt que « event », « membre » plutôt que « user ») ?",
        "Contrôle & liberté — peut-on revenir en arrière, annuler une action irréversible, fermer une modale au clavier ?",
        "Cohérence & standards — mêmes patterns sur toutes les pages (boutons primaires, modales, toasts, navigation) ?",
        "Prévention des erreurs — confirmations sur les actions destructrices, validation côté client avant soumission ?",
        "Reconnaissance plutôt que rappel — éléments visibles plutôt qu'à mémoriser (breadcrumbs, états actifs) ?",
        "Flexibilité & efficacité — raccourcis pour les power users (admin), tutoriels pour les débutantes ?",
        "Esthétique & minimalisme — chaque élément à l'écran sert l'objectif, ou y a-t-il du décoratif gratuit ?",
        "Aide à reconnaître & corriger les erreurs — messages humains, indication précise du problème et de la solution ?",
        "Aide & documentation — tooltips contextuels, FAQ accessible, support visible sans encombrer ?",
      ],
    },
    {
      title: "Système de design",
      items: [
        "Tokens — couleurs, typographies, espacements, radii, shadows formalisés en variables réutilisées partout ?",
        "Composants — bouton, input, card, modale, toast : un seul exemplaire de chaque, pas de variantes silencieuses ?",
        "Etats — hover, focus, active, disabled, loading, error : couverts pour chaque composant interactif ?",
        "Documentation — un Storybook ou équivalent pour qu'une nouvelle développeuse comprenne le système en 10 minutes ?",
      ],
    },
    {
      title: "Accessibilité (WCAG 2.2 AA)",
      items: [
        "Contraste — corps de texte ≥ 4.5:1, gros texte ≥ 3:1, composants UI ≥ 3:1 (Success Criterion 1.4.3 / 1.4.11) ?",
        "Navigation clavier — toute action accessible au clavier, ordre de tabulation logique, focus visible (1.3.1, 2.4.7) ?",
        "Sémantique — landmarks (<main>, <nav>, <header>), titres hiérarchisés, labels associés aux champs (1.3.1, 4.1.2) ?",
        "Mouvement & motion — animations désactivables (prefers-reduced-motion), pas d'auto-play vidéo (2.3.3) ?",
      ],
    },
    {
      title: "Performance & confiance",
      items: [
        "Time-to-interactive — la page s'utilise-t-elle en moins de 3 s sur connexion moyenne ?",
        "Loaders — squelettes plutôt que spinners pour réduire la perception d'attente ?",
        "Réseau dégradé — l'app communique-t-elle clairement quand une requête échoue (toast d'erreur explicite, retry proposé) ?",
        "RGPD — consentement cookies, mention paiement sécurisé, page CGU / mentions légales accessibles depuis le footer ?",
      ],
    },
  ],
};
