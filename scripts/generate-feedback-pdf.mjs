// Génère un audit UX/UI imprimable : pour chaque page du site, une capture
// d'écran sur une page A4 puis, sur la page A4 suivante, un set de questions
// rédigées du point de vue d'un·e UX researcher + d'un·e UI designer, avec
// une zone de notes libres.
//
// Pour pouvoir capturer les pages /admin sans dépendre d'un vrai backend
// Supabase (sandbox sans réseau sortant), on intercepte les appels Supabase
// au niveau Playwright et on retourne des données factices peuplées
// (cf. scripts/feedback-mock-supabase.mjs). Aucune modification du code de
// production n'est nécessaire.
//
// Utilisation : npm run feedback:pdf

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { attachSupabaseMock, buildAuthLocalStorage } from "./feedback-mock-supabase.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "feedback");
const SHOTS_DIR = path.join(OUT_DIR, "screenshots");
const PDF_PATH = path.join(OUT_DIR, "cocooningclub-feedback.pdf");
const HTML_PATH = path.join(OUT_DIR, "cocooningclub-feedback.html");

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// Chemin local de Chromium (préinstallé dans l'environnement)
const CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const VIEWPORT = { width: 1440, height: 900 };

// Pour chaque page, on collecte 4 questions UX (perception, parcours,
// friction, jobs-to-be-done) et 4 critiques UI (typographie, couleur,
// composants, espacement, microinteractions, accessibilité).
const PAGES = [
  {
    title: "Accueil",
    path: "/",
    section: "Site public",
    description:
      "Page d'atterrissage publique : promesse, parcours et CTA d'inscription.",
    ux: [
      "Test des 5 secondes — quelle est la promesse ? À qui s'adresse-t-elle ? Quel bénéfice émotionnel concret ? Si la réponse n'est pas immédiate, où le hero échoue-t-il (titre, sous-titre, visuel, CTA) ?",
      "Hiérarchie d'action — quel CTA est primaire ? L'œil le voit-il avant tout autre élément (loi de Fitts + zone Z/F) ? Combien d'éléments « shoutent » en simultané avant l'action attendue ?",
      "Réducteurs de friction (Nielsen #1, #5) — preuve sociale, prix, qui anime, format, garantie, premier atelier offert : quelle objection majeure n'est PAS levée avant le bouton « S'inscrire » ?",
      "Jobs-to-be-done — pour quoi une visiteuse « engage » ce site (rompre l'isolement, prendre soin d'elle, apprendre, créer du lien) ? Une seule promesse ressort-elle, ou plusieurs entrent en compétition ?",
    ],
    ui: [
      "Typographie — H1/H2/H3/corps distincts en taille ET en poids ? Corps ≥ 16px, line-height ≥ 1.5, longueur de ligne 60-75 caractères ? Famille « display » réservée aux titres ?",
      "Couleurs & contraste — palette restreinte (1 primaire, 1-2 accents, neutres) ? Ratios WCAG AA respectés sur le corps (4.5:1) et AAA sur les CTA ? La couleur primaire est-elle réservée à l'action ?",
      "Boutons & CTA — primaire vs secondaire vs lien clairement différenciés ? États hover / focus / active / disabled visibles ? Cible tactile ≥ 44 px ? Libellé orienté résultat (« Réserver ma place » > « En savoir plus ») ?",
      "Imagerie & rythme — photos cohérentes en style, ratio, traitement ? Grille d'espacement (8 / 16 / 24 / 32 / 64) reconnaissable ? Sujets qui dirigent le regard vers les CTA ou qui le détournent ?",
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
      "Mental model — vous attendez-vous à un agenda (mois), à une liste chronologique, à des cartes filtrables ? La vue par défaut correspond-elle à votre habitude (Google Calendar, Eventbrite, Doctolib) ?",
      "Décision d'inscription — quelles 4 informations faut-il VOIR sans cliquer pour décider (date, durée, niveau, places restantes, prix, lieu, animateur) ? Lesquelles manquent ?",
      "Filtres & scan — comment trouvez-vous un atelier qui vous correspond : par thème, par jour de la semaine, par tranche horaire ? Le tri par défaut est-il « le plus proche » ou « le plus pertinent » ?",
      "Etats limites — que voit-on si aucun atelier n'est planifié ? Si un atelier est complet ? Si la pré-inscription est fermée ? Ces états « vides » et « bloqués » sont-ils explicités ou laissent-ils dans le doute ?",
    ],
    ui: [
      "Densité d'information — chaque carte/ligne respire-t-elle ? Combien de niveaux de gris / couleurs sont utilisés au sein d'une même carte ? Quelle hiérarchie : titre > date > meta > CTA ?",
      "Statut visuel — places restantes, complet, annulé, nouveau : sont-ils portés par couleur + icône + texte (jamais couleur seule, accessibilité daltonisme) ?",
      "Affordance — sait-on au regard si une carte entière est cliquable ou seulement un bouton ? Le hover/focus le confirme-t-il ?",
      "Mobile — sur 360 px de large, les filtres restent-ils accessibles (sticky, drawer) ou disparaissent-ils ? Les cartes deviennent-elles illisibles ?",
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
      "Orientation — comprend-on en arrivant si l'espace est unique (membres + admin) ou s'il faut choisir un parcours ? Que faire si on n'a pas encore de compte ?",
      "Récupération d'erreur (Nielsen #9) — quel message attendez-vous pour un mauvais mot de passe : générique (sécurité) ou explicite ? Le message indique-t-il la procédure de récupération ?",
      "Confiance — quels signaux de sécurité auriez-vous aimé voir (cadenas, mention « connexion chiffrée », mention RGPD discrète) ? Ou est-ce déjà présent et invisible ?",
      "Rétention — manque-t-il « rester connectée », un magic link, une connexion sociale ? L'absence d'option « créer un compte » ici est-elle assumée ou un oubli ?",
    ],
    ui: [
      "Champs — labels au-dessus du champ (pas placeholder seul, sinon perte au focus) ? autocomplete=email / current-password ? inputmode=email sur mobile ?",
      "Bouton « œil » — taille de cible, contraste, position : ne masque-t-il pas la fin du champ sur mobile ? L'icône change-t-elle bien d'état ?",
      "Etat « connexion en cours » — bouton désactivé + spinner + libellé qui change ? Évite-t-on les double-soumissions ?",
      "Hiérarchie — entre « Se connecter » (primaire) et « Mot de passe oublié » (lien) le poids visuel est-il bien équilibré, ou la récupération attire-t-elle plus que la connexion ?",
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
      "Réassurance — le texte explique-t-il quoi attendre (un email, en combien de temps, depuis quelle adresse) ? Réduit-il l'angoisse du « ça ne marche pas » ?",
      "Plan B — si l'email n'arrive pas, l'utilisateur a-t-il une issue (vérifier les spams, renvoyer, contacter) ou se sent-il bloqué ?",
      "Sécurité vs clarté — le message après envoi confirme-t-il l'envoi sans révéler si l'email existe (pratique anti-énumération) ? Si oui, est-ce intelligible pour une utilisatrice non-tech ?",
      "Retour — le chemin de retour vers /login est-il visible mais pas distrayant pour l'action principale ?",
    ],
    ui: [
      "Charge cognitive — un seul champ, un seul bouton : la page tient-elle cette promesse minimaliste, ou ajoute-t-elle du bruit ?",
      "Feedback — un état succès clair (icône + couleur + texte) après soumission ? Un état erreur lisible (champ entouré + message rouge accessible) ?",
      "Rythme typographique — le titre, la consigne, le champ et le bouton respectent-ils la même grille verticale que /login ?",
      "Mobile — la page reste-t-elle lisible avec clavier ouvert (le bouton ne passe pas sous le clavier sur iOS) ?",
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
      "Contraintes affichées EN AMONT — règles de mot de passe (longueur, majuscules, etc.) visibles AVANT de taper, et validation progressive (live) ?",
      "Confirmation — second champ pour confirmer, ou bouton « afficher » suffit ? Quel pattern réduit le risque de typo ?",
      "Force — un indicateur de force (faible/moyen/fort) aide-t-il ou stresse-t-il ? Au-dessus d'un seuil, faut-il bloquer ?",
      "Sortie de tunnel — après succès, quel comportement attendu : redirection auto vers /login avec confirmation, ou rester sur place avec CTA explicite ?",
    ],
    ui: [
      "Visibilité du mot de passe — le bouton œil est-il accessible au clavier (focus visible) et tabIndex correct ?",
      "Couleur d'erreur — rouge accessible (≥ 4.5:1) avec icône, pas couleur seule. Le message indique-t-il QUOI corriger, pas juste « erreur » ?",
      "Bouton primaire — désactivé tant que les contraintes ne sont pas satisfaites, ou actif avec validation au submit ? Quel pattern frustre le moins ?",
      "Mobile — autocomplete=new-password pour permettre au gestionnaire de mots de passe de proposer une génération forte ?",
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
      "Empathie — le ton déculpabilise-t-il (« la page a déménagé », « l'adresse n'existe plus ») plutôt qu'il n'accuse l'utilisateur ?",
      "Voies de rattrapage — au moins 3 sorties offertes : retour accueil, calendrier, recherche / contact ? Sans surcharger la page ?",
      "Identité — le 404 est-il l'occasion d'exprimer la marque (illustration, vocabulaire « cocooning ») ou est-il technique et froid ?",
      "Diagnostic — l'URL erronée est-elle rappelée pour comprendre où le lien a cassé ?",
    ],
    ui: [
      "Composition — le 404 utilise-t-il les mêmes header/footer que le reste du site (cohérence) ou semble-t-il orphelin ?",
      "Iconographie / illustration — y a-t-il un visuel ? S'inscrit-il dans la palette ou ressort-il comme un asset stock ?",
      "Hiérarchie — le titre « 404 » est-il subordonné au message humain, ou l'inverse ? Quel est l'élément qui domine ?",
      "Accessibilité — le titre <h1> reflète-t-il le contenu (« Page introuvable »), pas juste « 404 » ? L'attribut <title> et la balise <main> sont-ils corrects ?",
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
      "« Above the fold » — quelles 3 informations doivent être visibles sans scroller pour démarrer la journée (pré-inscriptions à traiter, prochain atelier, alertes) ? Le sont-elles ?",
      "Top-tasks — quelle action lancez-vous le plus souvent (créer atelier, valider inscription, envoyer message) ? Est-elle accessible en 1 clic depuis ici ?",
      "Bruit vs signal — quels indicateurs affichés sont du « vanity » et lesquels sont actionnables ? Quel chiffre déclenche réellement une décision chez vous ?",
      "Cadrage temporel — les chiffres sont-ils explicitement datés (semaine en cours, mois, depuis le début) ? Une comparaison vs période précédente serait-elle utile ?",
    ],
    ui: [
      "Cartes KPI — chiffre dominant + label + tendance + sparkline ? Hiérarchie respectée, ou tout au même poids ?",
      "Couleur sémantique — vert/rouge réservés aux variations chiffrées, jamais décoratifs ? Couleur primaire encore utilisée pour les CTA, pas pour décorer les cartes ?",
      "Densité — combien de blocs d'information sur l'écran initial ? Loi de Hick : trop de choix ralentit. Y a-t-il une organisation par groupe (revenus / activités / membres) ?",
      "Navigation latérale — items lisibles, état actif évident, icônes + labels (pas icônes seules), ordre = fréquence d'usage et non ordre alphabétique ?",
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
      "Recherche — pour quel type de requête est-elle optimisée (nom, email, téléphone, atelier suivi) ? Le placeholder le précise-t-il ?",
      "Filtres pertinents — quels 3 filtres répondent à 80 % des cas (statut, ancienneté, atelier en cours) ? Sont-ils combinables et persistés ?",
      "Actions de masse — sélection multiple → exporter, envoyer un message, archiver : présentes ? La pattern d'usage actuelle (Excel, mail) serait-elle remplacée ?",
      "Fiche membre — quelles infos clés (paiement, présence, notes privées) doivent être en haut de la fiche ? Y a-t-il un risque de surcharge ?",
    ],
    ui: [
      "Tableau — alignements (texte à gauche, chiffres à droite), zebra-stripes ou non, hauteur de ligne suffisante (≥ 44 px) pour la sélection ?",
      "Pagination vs scroll infini — choix cohérent avec un usage admin (pagination = repère stable) ? Compteur total visible ?",
      "Avatar / initiales — placeholder cohérent quand pas de photo, contraste suffisant, taille uniforme ?",
      "Statuts — pastilles colorées avec texte (jamais couleur seule), bord arrondi, taille suffisante pour le scan ?",
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
        "4 rôles possibles : `administrateur`, `inscrit`, `membre`, `membre_premium`.",
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
      "Time-to-create — combien d'étapes pour publier un atelier ? Le formulaire suit-il l'ordre d'une création naturelle (titre → date → format → jauge → publication) ?",
      "Réutilisation — une fonction « dupliquer » ou « modèles » réduit-elle l'effort sur les ateliers récurrents ?",
      "États — brouillon / planifié / complet / annulé / passé : tous représentés visuellement et filtrables ? Que devient un atelier passé (archivage, statistiques) ?",
      "Risques — double-saisie, conflit de date avec un autre atelier, jauge dépassée : l'outil prévient-il (validation côté client) ou laisse-t-il faire ?",
    ],
    ui: [
      "Formulaire — labels au-dessus, champs groupés par bloc (information / planning / inscriptions), aide contextuelle plutôt que tooltip caché ?",
      "Date & heure — composant adapté à la saisie rapide au clavier (pas seulement picker souris) ? Format affiché localisé (« lun. 12 mai · 14h-16h ») ?",
      "Boutons d'enregistrement — « Enregistrer brouillon » vs « Publier » bien différenciés visuellement ? Position fixe en bas pour les longs formulaires ?",
      "Validation — erreurs ancrées au champ ET résumé en haut, focus auto sur le premier champ en erreur (accessibilité) ?",
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
      "Cycle de vie — quels statuts existent dans votre tête (nouvelle / à relancer / confirmée / refusée / payée) ? Sont-ils tous représentés et dans le bon ordre ?",
      "Priorité — quelle ligne dois-je traiter en premier ce matin ? L'outil le suggère-t-il (tri par ancienneté de pré-inscription, par atelier imminent) ?",
      "Action en ligne — confirmer / refuser / relancer en 1 clic depuis la liste, ou faut-il ouvrir une fiche ? Quel coût d'usage ?",
      "Boucle de feedback — la candidate est-elle automatiquement notifiée de son changement de statut, ou faut-il un message manuel ?",
    ],
    ui: [
      "Colonnes scannables — les 4 colonnes les plus utiles (nom, atelier, statut, date) sont-elles lisibles à largeur normale sans scroller horizontalement ?",
      "Icônes d'action — actions destructrices (refus) visuellement différenciées des actions positives (confirmer) ? Confirmation modale avant action irréversible ?",
      "Empty state — quand aucune pré-inscription, message qui guide (« Aucune pré-inscription en attente — partagez le lien d'inscription ») ou écran vide anxiogène ?",
      "Notification visuelle — un badge sur l'item de menu indique le nombre en attente ? Evite-t-il d'avoir à venir vérifier ?",
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
      "Modèle d'organisation — par dossiers (arbre), par tags (libre), par types (règlement, fiches, factures) ? Lequel correspond à votre tête ?",
      "Visibilité — un document peut-il être restreint à un groupe (un atelier, un membre) ? Les permissions sont-elles compréhensibles sans formation ?",
      "Cycle de vie — comment savoir qu'un doc est obsolète (date de mise à jour visible, alerte au-delà de X mois) ?",
      "Notification — l'ajout déclenche-t-il une notification membre (utile) ou se fait-il en silence (intrusif évité) ? Toggle au moment de l'upload ?",
    ],
    ui: [
      "Liste vs grille — tuiles avec aperçu pour les visuels, liste pour les documents textuels ? Bascule possible ?",
      "Drag & drop — zone d'upload visuellement explicite, état hover, pourcentage et erreur clairs pendant le transfert ?",
      "Métadonnées — taille, type, date d'ajout, nombre de téléchargements lisibles d'un coup d'œil sans alourdir la ligne ?",
      "Actions — télécharger / partager / supprimer accessibles via menu kebab ou hover, jamais cachés ; confirmation pour la suppression ?",
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
        "Définit l'accès (`membres`, `premium`, `tous`).",
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
        "3 niveaux d'accès : `membres`, `premium` (sous-ensemble), `tous` (membres + premium).",
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
      "Effort vs qualité — formulaire long = filtre fort mais taux de complétion bas ; court = plus de leads à qualifier. Quelle stratégie est assumée ici ?",
      "Champs conditionnels — questions dépendant des réponses précédentes (ex. « si déjà membre, sinon… ») ? Réduit la longueur perçue.",
      "Aperçu — peut-on voir le rendu utilisateur avant publication, exactement comme une candidate le verra (mobile inclus) ?",
      "Sortie — où va une réponse (export CSV, base, email) ? Le flux est-il fluide ou nécessite-t-il du copier-coller ?",
    ],
    ui: [
      "Builder — drag & drop pour réordonner les champs ? Les actions « ajouter » / « supprimer » / « dupliquer » sont-elles bien différenciées ?",
      "Types de champ — texte court / long / choix / date / consentement RGPD : couvrent-ils les besoins ? Les libellés et helper text sont-ils éditables séparément ?",
      "Obligatoire vs facultatif — convention visuelle (* pour requis) cohérente avec le reste de l'app ?",
      "Etat de publication — différenciation visuelle entre brouillon, publié, archivé ; date de dernière publication visible ?",
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
      "Top 3 — quels sont les 3 messages que vous écrivez le plus souvent à la main aujourd'hui ? Sont-ils déjà modélisables ici ?",
      "Variables — {{prénom}}, {{atelier}}, {{date}}, {{lien}} : disponibles ? Documentation visible dans l'éditeur ?",
      "Canal — différenciation email (long, mise en forme) vs SMS (court, sans HTML) explicite ? Compteur de caractères pour SMS ?",
      "Test — peut-on s'envoyer un test avant utilisation réelle, et prévisualiser avec données réelles ?",
    ],
    ui: [
      "Editeur — WYSIWYG cohérent (gras, italique, lien) sans surcharge ? Switch vers source HTML possible pour les avancés ?",
      "Aperçu côte à côte — édition à gauche, rendu à droite, ou mode séparé ? Quel est le moins déroutant ?",
      "Bibliothèque de templates — tri par usage récent / nom / canal ? Recherche utile dès qu'on dépasse 5-6 modèles ?",
      "Versioning — historique des modifications visible ? Possibilité de revenir à une version antérieure ?",
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
      "Granularité — créneau d'1h, demi-journée, journée entière : laquelle reflète votre réalité de planification ?",
      "Récurrence — règles couvrant 80 % des cas (« tous les mardis 14h-16h », « 1er samedi du mois ») ? Exception ponctuelle (vacances) gérable en 2 clics ?",
      "Conflit — si on tente de planifier sur un créneau indisponible, l'outil bloque-t-il, prévient-il, ou laisse-t-il faire ?",
      "Visibilité — qui voit ces disponibilités (membres lors de l'inscription) ? Comment l'admin sait-elle ce qui est exposé publiquement ?",
    ],
    ui: [
      "Visualisation calendrier — vue semaine claire (lundi-dimanche, heures empilées), vue mois pour vision d'ensemble ? Bascule rapide ?",
      "Couleurs de créneau — disponible / pris / bloqué visuellement distincts (texture + couleur, pas couleur seule) ?",
      "Création — drag pour étendre un créneau, click pour ajouter, double-click pour modifier : interactions cohérentes avec Google Calendar / Cal.com ?",
      "Mobile — la grille reste-t-elle utilisable sur téléphone, ou bascule-t-elle automatiquement vers une liste ?",
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
      "Cycle de vie d'une idée — nouvelle / à étudier / retenue / refusée / réalisée : tous présents ? Qui peut faire passer d'un état à l'autre ?",
      "Boucle de retour — la membre qui a suggéré est-elle informée du changement de statut ? Notification automatique vs message manuel choisi ?",
      "Visibilité communauté — les autres membres voient-elles les idées ? Peuvent-elles voter / commenter ? Avantages (engagement) vs risques (désaccord public) ?",
      "Capacité d'action — le format actuel permet-il de transformer une idée en atelier (lien, conversion en planning) ou reste-t-il un cimetière à idées ?",
    ],
    ui: [
      "Carte d'idée — auteur, date, statut, votes, lisibles d'un coup d'œil ? Hiérarchie titre > description > meta ?",
      "Tri & filtre — par statut, par date, par nombre de votes ? Tri par défaut = celui qui aide le plus l'admin ?",
      "Statuts colorés — palette cohérente avec le reste de l'app, pas trop de couleurs (5 statuts max recommandés) ?",
      "Empty state — encourage à inviter les membres à proposer (lien à partager, QR code) ?",
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
      "Décision rapide — pour modérer 20 avis, quel format vous fait gagner le plus de temps : liste dense, kanban (en attente / approuvé / rejeté), cartes ?",
      "Critères implicites — sur quoi vous appuyez-vous pour approuver / rejeter (note, vocabulaire, longueur, identité de l'auteur) ? L'outil rend-il ces critères visibles ?",
      "Boucle membre — l'auteur de l'avis est-il informé de l'approbation / du rejet ? Délai vécu acceptable ?",
      "Mise en avant — comment décidez-vous quel avis devient « témoignage vedette » sur la home ? Le critère est-il purement éditorial ou y a-t-il des règles (note ≥ 4, plus de X mots) ?",
    ],
    ui: [
      "Affichage de la note — étoiles colorées + chiffre, pas étoiles seules. Différenciation visuelle 1-2 / 3 / 4-5 (rouge / ambre / vert) ?",
      "Badges de statut — `en_attente`, `approuve`, `rejete` distincts par couleur ET icône ; cohérence avec les autres tables admin ?",
      "Actions inline — boutons « Approuver / Rejeter / Mettre en avant » accessibles sans ouvrir une fiche ; confirmation modale uniquement pour les actions destructrices ?",
      "Densité — chaque avis sur 2-3 lignes max (auteur, note, atelier, date, début du commentaire). Expansion au clic pour le commentaire complet ?",
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
      "Auto-suffisance — quelles informations puis-je modifier moi-même (téléphone, photo, mot de passe) sans appeler un développeur ? Lesquelles sont en lecture seule (email, identité) ?",
      "Sécurité — la procédure de changement de mot de passe demande-t-elle l'ancien (bonne pratique) ? Une 2FA est-elle proposée ou prévue ?",
      "Multi-comptes — y a-t-il une notion de co-administratrice ? Si oui, comment gère-t-on les permissions différentes (lecture seule, édition, super-admin) ?",
      "Déconnexion — évidente et accessible depuis n'importe quelle page (header), pas seulement « Mon compte » ? Particulièrement critique sur poste partagé.",
    ],
    ui: [
      "Sections — informations personnelles / sécurité / préférences clairement séparées (cards ou onglets), pas tout en vrac ?",
      "Champs read-only — visuellement distincts (fond grisé, pas de bord d'input), avec icône ou mention « non modifiable » ?",
      "Boutons d'action destructive — « Supprimer le compte » en bas, en couleur tertiaire, jamais collé à « Enregistrer » (Nielsen #5 : prévenir les erreurs) ?",
      "Confirmation — toast de succès après sauvegarde, qui confirme QUOI a été enregistré (pas juste « OK ») ?",
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
      "Personnalisation — la salutation et les contenus reflètent-ils la membre (prénom, prochain atelier, dernière action) ou est-ce générique pour tout le monde ?",
      "Top-tasks membre — les 3 actions principales (consulter mes inscriptions, m'inscrire à un atelier, lire le magazine) sont-elles à 1 clic depuis ici ?",
      "Empty state — si la membre n'a aucune inscription, l'écran l'invite-t-il chaleureusement à découvrir le calendrier ?",
      "Engagement — qu'est-ce qui donne envie de revenir chaque semaine sur cet espace (nouveauté, magazine, témoignage, prochain atelier) ?",
    ],
    ui: [
      "Hiérarchie — le bloc « prochaine inscription » domine-t-il visuellement, ou est-il noyé dans la grille ?",
      "Cohérence avec /admin — sidebar similaire (icônes, navigation), même langage visuel pour rassurer ?",
      "Mobile — la page reste-t-elle utile sur 360px (la majorité des consultations membre sont mobiles) ?",
      "Microinteractions — hover sur les cartes, transitions douces alignées avec l'identité « cocooning » ?",
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
        "Rôle `membre_premium` → redirection vers /espace-membre-premium.",
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
      "Différence avec /calendrier public — qu'apporte cette page de plus (tarif membre, badge déjà inscrite, recommandations) ?",
      "Friction d'inscription — depuis l'espace membre, l'inscription doit être fluide (pas de re-saisie nom/email puisque connectée). Est-ce le cas ?",
      "Filtres — par thème, par jour de la semaine, par animatrice ; lesquels sont vraiment utiles vs gadget ?",
      "Indicateur « déjà inscrite » — visible immédiatement sur la carte, ou faut-il cliquer pour le découvrir ?",
    ],
    ui: [
      "Densité — combien de cartes visibles sur 1 écran (idéal 4-6) ? Photo / titre / date / places / CTA, hiérarchie respectée ?",
      "État « inscrite » — pastille verte + texte explicite (« Inscrite ») plutôt que simple changement de couleur du bouton ?",
      "Empty state — si la membre est déjà inscrite à tous les ateliers à venir, le message est-il chaleureux (« Vous êtes à jour ! ») ?",
      "Mobile — disposition en 1 colonne, photo recadrée, CTA en pleine largeur ?",
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
      "Granularité — la membre voit-elle 3 sections (à venir, passées, annulées) ou tout en mélange ?",
      "Action principale — qu'est-ce qui domine : « Annuler une inscription », « Télécharger ma facture », « Laisser un avis » ? L'outil priorise-t-il le bon ?",
      "Réassurance — chaque inscription porte-t-elle ses informations clés (date, lieu, statut, paiement) sans devoir cliquer ?",
      "Avis post-atelier — la membre est-elle invitée à laisser un avis seulement APRÈS l'atelier (et pas avant) ?",
    ],
    ui: [
      "Pastilles statut — `en_attente`, `confirme`, `annule`, `passe` distinctes visuellement ; même palette que côté admin ?",
      "Statut paiement — `non_requis`, `en_attente`, `paye` portés par couleur + texte ; jamais couleur seule ?",
      "Actions destructrices — « Annuler » en couleur tertiaire (gris bordé), pas rouge agressif sauf confirmation.",
      "Densité — passé sur 1 ligne, à venir sur 2 lignes (plus d'infos), annulé en grisé.",
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
      "Découverte — un seul numéro courant ou archive complète ? La membre comprend-elle ce qui est nouveau depuis sa dernière visite ?",
      "Confort de lecture — lecture en ligne fluide ? Téléchargement PDF possible ? Les deux options coexistent-elles harmonieusement ?",
      "Sommaire — l'œil voit-il rapidement les articles disponibles, ou faut-il scroller longtemps ?",
      "Engagement — l'envie de revenir chaque mois passe par quoi (couverture séduisante, teasing du prochain numéro, sommaire alléchant) ?",
    ],
    ui: [
      "Couverture — image de couverture nette, ratio cohérent (4:3 ou 3:4), texte minimal (titre + numéro) ?",
      "Sommaire — typographie de magazine (sérif élégante pour les titres d'articles), espacement aéré ?",
      "Bouton de téléchargement — secondaire, jamais en concurrence avec « Lire en ligne » ?",
      "Mobile — le PDF s'affiche-t-il dans un viewer intégré ou une nouvelle page ? Performance acceptable ?",
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
        "Membre premium → version enrichie (articles supplémentaires) — à vérifier côté /espace-membre-premium/magazine.",
      ],
      regles: [
        "Stockage : bucket Supabase Storage privé, accès via signed URL.",
        "Visibilité fonction du rôle : `membre` voit la version standard, `membre_premium` voit la version premium.",
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
      "Champs modifiables — quels champs la membre peut-elle modifier seule (téléphone, photo, mot de passe) vs lesquels nécessitent un contact admin (email, identité) ?",
      "Sécurité — la procédure de changement de mot de passe demande-t-elle l'ancien (bonne pratique) ?",
      "Désinscription — peut-elle supprimer son compte ? Si oui, le parcours est-il clair, irréversible, expliqué (que devient son historique) ?",
      "Préférences de communication — opt-in/opt-out clair pour newsletters, rappels SMS, etc. ?",
    ],
    ui: [
      "Sections — informations personnelles / sécurité / préférences / abonnement clairement séparées.",
      "Champs read-only — fond grisé, icône cadenas, mention explicite « non modifiable, contactez-nous ».",
      "Action destructrice — « Supprimer mon compte » en bas de page, en couleur tertiaire, jamais collée à « Enregistrer ».",
      "Toast de confirmation — qui résume QUOI a été enregistré (« Téléphone mis à jour » et non juste « OK »).",
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
  {
    title: "Premium · Tableau de bord",
    path: "/espace-membre-premium",
    section: "Espace membre premium (rôle membre_premium)",
    description: "Page d'accueil de l'espace premium, avec contenus exclusifs et avantages.",
    ux: [
      "Différence vs espace membre standard — qu'est-ce qui justifie visuellement le statut premium (couleur, badge, contenu exclusif) sans tomber dans l'ostentatoire ?",
      "Contenus exclusifs — sont-ils mis en avant immédiatement, ou la membre doit-elle les chercher ?",
      "Sentiment d'appartenance — le ton est-il chaleureux et personnalisé, ou indifférencié de l'espace standard ?",
      "Renouvellement — à quelle fréquence les contenus exclusifs changent-ils ? La membre le perçoit-elle ?",
    ],
    ui: [
      "Marqueur premium — un badge ou liseré discret dans le header indique le statut sans crier.",
      "Couleur d'accent — différente du standard (par exemple plus chaude, plus dorée) pour signifier la valeur sans changer la marque.",
      "Hiérarchie — bloc « avantages premium » accessible mais pas dominant ; les actions courantes restent prioritaires.",
      "Cohérence — sidebar et navigation strictement identiques au standard pour ne pas perdre la membre qui upgrade.",
    ],
    spec: {
      acteur: "Membre premium (rôle `membre_premium`).",
      objectif:
        "Accéder à un espace personnalisé avec contenus et avantages exclusifs, sans rupture d'expérience avec l'espace standard.",
      preconditions: [
        "Session active avec rôle `membre_premium` ou `administrateur` (RoleGuard).",
        "Abonnement premium en cours de validité (`fin_abonnement >= today`).",
      ],
      parcoursNominal: [
        "Se connecte → redirection vers /espace-membre-premium si rôle premium.",
        "Voit son tableau de bord enrichi : prochain atelier, magazine premium, contenu exclusif.",
        "Clique sur un raccourci → navigation vers les sous-pages premium.",
      ],
      parcoursAlternatifs: [
        "Abonnement expiré → redirection vers une page de renouvellement (à concevoir).",
        "Rôle non premium → redirection vers /espace-membre standard.",
        "Aucun atelier ni contenu → empty state contextualisé premium.",
      ],
      regles: [
        "Visibilité réservée aux rôles `membre_premium` et `administrateur`.",
        "Vérification de validité d'abonnement à chaque chargement (à coupler avec un trigger DB).",
        "RLS : strictement la même que pour le membre standard, sauf accès à des bucket Storage spécifiques (`magazine_premium`).",
      ],
      postconditions:
        "Membre premium orientée vers ses contenus exclusifs ou ses prochaines actions.",
    },
  },
  {
    title: "Premium · Ateliers",
    path: "/espace-membre-premium/ateliers",
    section: "Espace membre premium (rôle membre_premium)",
    description: "Catalogue des ateliers, version premium (priorité d'accès, tarif réduit, ateliers exclusifs).",
    ux: [
      "Avantage perceptible — la membre premium voit-elle un avantage immédiat (tarif réduit, accès anticipé, ateliers exclusifs étiquetés) ?",
      "Ateliers exclusifs — sont-ils mis en avant ou noyés dans la liste générale ?",
      "Tarif — affichage du prix premium (vs standard barré) pour rendre l'avantage tangible ?",
      "FOMO — y a-t-il des places limitées « réservées premium » avec délai d'expiration avant ouverture au standard ?",
    ],
    ui: [
      "Étiquette « Exclusif premium » — pastille dorée discrète sur les cartes concernées, jamais agressive.",
      "Prix barré — `<s>32 €</s> 24 €` ou équivalent visuel pour montrer la remise.",
      "Cohérence avec /espace-membre/ateliers — même grille, même flux d'inscription, juste les avantages premium superposés.",
      "Mobile — l'étiquette premium ne doit pas masquer le titre ou le CTA.",
    ],
    spec: {
      acteur: "Membre premium s'inscrivant à un atelier.",
      objectif:
        "Bénéficier d'un accès prioritaire et / ou d'un tarif réduit aux ateliers du club.",
      preconditions: [
        "Session premium active.",
        "Au moins un atelier publié à venir.",
      ],
      parcoursNominal: [
        "Arrive sur /espace-membre-premium/ateliers.",
        "Voit la liste avec mise en avant des ateliers exclusifs et tarifs premium.",
        "Clique « M'inscrire » → inscription en 1 clic au tarif premium.",
        "Toast de confirmation et badge « Inscrite » immédiat.",
      ],
      parcoursAlternatifs: [
        "Atelier exclusif premium → invisible pour les non-premium (filtre côté DB).",
        "Atelier complet → liste d'attente avec priorité premium.",
        "Erreur de paiement → retry possible sans perdre la pré-réservation pendant 15 minutes.",
      ],
      regles: [
        "Tarif appliqué : `tarif_premium` (champ à ajouter ?) ou règle de remise globale (-X% sur `tarif_standard`).",
        "Accès anticipé : ateliers ouverts aux premium 48h avant les standards (à confirmer côté trigger).",
        "Ateliers `exclusif_premium = true` invisibles au rôle `membre`.",
      ],
      postconditions:
        "Inscription créée au tarif premium, place réservée prioritairement.",
    },
  },
  {
    title: "Premium · Mes inscriptions",
    path: "/espace-membre-premium/inscriptions",
    section: "Espace membre premium (rôle membre_premium)",
    description: "Suivi des inscriptions de la membre premium (équivalent membre standard avec services additionnels).",
    ux: [
      "Différence vs standard — quels services premium sont offerts ici (annulation jusqu'au dernier moment, échange entre ateliers, factures consolidées) ?",
      "Visibilité du statut paiement — le tarif premium est-il visible sur chaque ligne pour rappeler l'avantage ?",
      "Historique — combien de temps la membre voit-elle ses inscriptions passées (toujours, 1 an, 3 ans) ?",
      "Actions premium — « Reporter à un autre atelier sans frais » est-elle proposée comme avantage spécifique ?",
    ],
    ui: [
      "Cohérence avec /espace-membre/inscriptions — grille identique, juste enrichie d'actions premium en plus.",
      "Badge « Premium » discret sur l'en-tête de page pour rappeler le statut sans intruser.",
      "Boutons d'actions premium — couleur dorée subtile pour les distinguer des actions standard (annulation classique).",
      "Densité — inchangée par rapport au standard, pas de surcharge décorative.",
    ],
    spec: {
      acteur: "Membre premium gérant ses inscriptions avec services enrichis.",
      objectif:
        "Suivre, annuler, reporter ou échanger ses inscriptions avec les avantages liés au statut premium.",
      preconditions: ["Session premium active.", "Au moins une inscription liée."],
      parcoursNominal: [
        "Arrive sur /espace-membre-premium/inscriptions.",
        "Voit ses inscriptions avec actions étendues (reporter, échanger).",
        "Pour reporter : sélectionne un autre atelier compatible → mise à jour de l'inscription existante (pas de double annulation/inscription).",
      ],
      parcoursAlternatifs: [
        "Annulation jusqu'à 2h avant l'atelier (vs 24h pour standard).",
        "Échange entre ateliers du même mois sans frais.",
        "Téléchargement de toutes les factures de l'année en 1 clic (consolidé).",
      ],
      regles: [
        "Service premium : annulation tardive (jusqu'à 2h avant), échange sans frais, factures consolidées.",
        "Limite : 3 reports par mois, au-delà retour aux conditions standard.",
        "Toutes les transitions sont loguées pour audit.",
      ],
      postconditions:
        "Inscription mise à jour ; éventuel email de confirmation au nouvel atelier.",
    },
  },
  {
    title: "Premium · Magazine",
    path: "/espace-membre-premium/magazine",
    section: "Espace membre premium (rôle membre_premium)",
    description: "Magazine premium : articles bonus, archives complètes, formats enrichis.",
    ux: [
      "Valeur ajoutée — qu'est-ce qui distingue le magazine premium du standard (articles bonus, vidéo, podcast, archives complètes) ?",
      "Découverte — la membre voit-elle d'un coup d'œil ce qu'elle gagne en plus du standard ?",
      "Archives — accessibles depuis combien de temps en arrière (depuis le début de l'abonnement, illimité) ?",
      "Téléchargement — possible pour tous les contenus, ou DRM/streaming uniquement ?",
    ],
    ui: [
      "Marqueur « Bonus premium » — pastille dorée sur les sections exclusives.",
      "Couverture du numéro courant — plus grande que sur le standard, traitement éditorial soigné.",
      "Sommaire — distinction visuelle entre articles standard et bonus.",
      "Mobile — viewer PDF intégré, navigation claire entre sections.",
    ],
    spec: {
      acteur: "Membre premium accédant aux contenus éditoriaux enrichis.",
      objectif:
        "Profiter de contenus exclusifs (articles, vidéos, podcasts) en complément du magazine standard.",
      preconditions: [
        "Session premium active.",
        "Magazine en ligne et bonus premium disponibles dans Storage.",
      ],
      parcoursNominal: [
        "Arrive sur /espace-membre-premium/magazine.",
        "Voit le numéro courant + section bonus premium dédiée.",
        "Lit en ligne ou télécharge selon le format.",
      ],
      parcoursAlternatifs: [
        "Membre standard tente d'accéder à l'URL → redirection vers /espace-membre/magazine.",
        "Bonus pas encore publié → message d'attente.",
        "Archive demandée → accès illimité aux anciens numéros depuis le début de l'abonnement.",
      ],
      regles: [
        "Bucket Storage `magazine_premium` accessible uniquement aux rôles `membre_premium` (RLS).",
        "Signed URL valable 1h pour chaque ressource.",
        "Format autorisé : PDF, MP4 (vidéo), MP3 (podcast).",
      ],
      postconditions:
        "Contenu premium consulté ou téléchargé ; signed URL expirée après 1h.",
    },
  },
  {
    title: "Premium · Mon compte",
    path: "/espace-membre-premium/mon-compte",
    section: "Espace membre premium (rôle membre_premium)",
    description: "Paramètres personnels de la membre premium, avec gestion d'abonnement.",
    ux: [
      "Gestion d'abonnement — la membre voit-elle clairement la date de fin, le mode de renouvellement, les factures passées ?",
      "Changement d'abonnement — bascule premium ↔ standard simple à comprendre, sans piège type « renouvellement caché » ?",
      "Avantages rappelés — la page rappelle-t-elle subtilement ce que la membre paye (« Vous bénéficiez de X, Y, Z grâce à votre statut premium ») ?",
      "Résiliation — parcours clair, irréversible, expliqué (que devient son compte, ses inscriptions futures) ?",
    ],
    ui: [
      "Bloc « Mon abonnement » — encart distinct avec date, statut, montant, prochain prélèvement.",
      "Bouton « Résilier » — couleur tertiaire, jamais rouge agressif sauf confirmation.",
      "Liste des factures — tableau scrollable, téléchargement individuel + export global.",
      "Cohérence avec /espace-membre/mon-compte — sections identiques, juste enrichies du bloc abonnement.",
    ],
    spec: {
      acteur: "Membre premium gérant son profil et son abonnement.",
      objectif:
        "Mettre à jour son profil, gérer son abonnement (renouvellement, résiliation), consulter et télécharger ses factures.",
      preconditions: ["Session premium active.", "Au moins un cycle d'abonnement enregistré."],
      parcoursNominal: [
        "Arrive sur /espace-membre-premium/mon-compte.",
        "Voit son profil + bloc abonnement (date de fin, montant, prochain prélèvement).",
        "Modifie son profil ou télécharge ses factures.",
      ],
      parcoursAlternatifs: [
        "Résiliation → modale de confirmation détaillée (date d'effet, conséquences sur les inscriptions futures).",
        "Renouvellement automatique en panne (paiement refusé) → toast d'alerte + redirection vers /paiement.",
        "Bascule en standard → confirmation, prise d'effet à la fin de la période payée.",
      ],
      regles: [
        "Le rôle `membre_premium` est lié à un abonnement actif (table `abonnements` ou champs `debut_abonnement`/`fin_abonnement`).",
        "À l'expiration sans renouvellement, le rôle bascule automatiquement en `membre`.",
        "Les factures sont stockées dans Storage privé `factures` (RLS strict).",
      ],
      postconditions:
        "Profil ou abonnement mis à jour ; éventuelle confirmation par email pour les changements critiques.",
    },
  },
];

// Audit transverse final imprimé en clôture du PDF.
const TRANSVERSE_AUDIT = {
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

function log(msg) {
  console.log(`[feedback-pdf] ${msg}`);
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Le serveur ${url} n'a pas répondu dans le délai imparti.`);
}

function startPreviewServer() {
  log("Démarrage de Vite preview (build statique) sur le port " + PORT + "…");
  const child = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT)],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
    }
  );
  child.stdout.on("data", (d) => process.stdout.write(`[vite] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[vite] ${d}`));
  return child;
}

const STUB_ENV = {
  VITE_SUPABASE_URL:
    process.env.VITE_SUPABASE_URL || "https://stub.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "stub-anon-key",
};

async function buildSite() {
  log("Build production en cours…");
  await new Promise((resolve, reject) => {
    const child = spawn("npx", ["vite", "build"], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, ...STUB_ENV },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`vite build a échoué (code ${code})`))
    );
  });
  log("Build terminé.");
}

async function captureScreenshots(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });

  // Mock complet de Supabase (auth + REST + RPC) au niveau réseau Playwright,
  // pour que les pages /admin se peuplent de données factices réalistes.
  await attachSupabaseMock(context, log);

  // Pré-charge la session admin dans localStorage pour les routes
  // authentifiées (/admin, /espace-membre, /espace-membre-premium), et
  // l'efface pour les pages publiques (sinon /login, /forgot-password
  // redirigent immédiatement vers /admin/dashboard).
  const supabaseUrl = STUB_ENV.VITE_SUPABASE_URL;
  const seed = buildAuthLocalStorage(supabaseUrl);
  await context.addInitScript(({ key, value }) => {
    try {
      const path = window.location.pathname;
      const needsAuth =
        path.startsWith("/admin") ||
        path.startsWith("/espace-membre");
      if (needsAuth) {
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }, seed);

  const page = await context.newPage();
  const results = [];

  for (const def of PAGES) {
    const url = `${BASE_URL}${def.path}`;
    const filename = (def.path === "/" ? "index" : def.path.replace(/^\//, "").replace(/\//g, "_")) + ".png";
    const file = path.join(SHOTS_DIR, filename);
    log(`Capture ${def.title} (${url})`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.children.length > 0 && root.innerText.trim().length > 0;
        },
        null,
        { timeout: 15_000 }
      ).catch(() => log(`  ⚠️ #root toujours vide pour ${def.path}`));
      await page
        .waitForLoadState("networkidle", { timeout: 10_000 })
        .catch(() => {});
    } catch (err) {
      log(`  ⚠️ Navigation lente, on continue : ${err.message}`);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: file, fullPage: true });
    results.push({ ...def, file: path.relative(OUT_DIR, file), absFile: file });
  }

  await context.close();
  return results;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml(captures) {
  const grouped = new Map();
  for (const c of captures) {
    if (!grouped.has(c.section)) grouped.set(c.section, []);
    grouped.get(c.section).push(c);
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const tocItems = [];
  let i = 1;
  for (const [section, items] of grouped) {
    tocItems.push(`<li class="toc-section">${escapeHtml(section)}</li>`);
    for (const item of items) {
      tocItems.push(
        `<li class="toc-item"><span>${i}. ${escapeHtml(item.title)}</span><span class="toc-path">${escapeHtml(item.path)}</span></li>`
      );
      i++;
    }
  }

  let pageNumber = 1;
  const pages = captures
    .map((c) => {
      const num = pageNumber++;

      const uxList = c.ux
        .map(
          (q) => `
          <li class="question">
            <div class="question-text">${escapeHtml(q)}</div>
            <div class="answer-lines">
              <div class="line"></div>
              <div class="line"></div>
            </div>
          </li>`
        )
        .join("");

      const uiList = c.ui
        .map(
          (q) => `
          <li class="question">
            <div class="question-text">${escapeHtml(q)}</div>
            <div class="answer-lines">
              <div class="line"></div>
              <div class="line"></div>
            </div>
          </li>`
        )
        .join("");

      // Page A : capture pleine page
      const screenshotPage = `
      <section class="page page-screenshot pb">
        <header class="screenshot-header">
          <div class="page-num">#${num}</div>
          <div class="screenshot-title">
            <div class="section-tag">${escapeHtml(c.section)}</div>
            <h2>${escapeHtml(c.title)}</h2>
            <div class="path">${escapeHtml(c.path)}</div>
          </div>
        </header>
        <div class="screenshot-fullbleed">
          <img src="${encodeURI(c.file)}" alt="Capture de ${escapeHtml(c.title)}" />
        </div>
        <p class="caption">${escapeHtml(c.description)}</p>
      </section>`;

      // Page B : spécification fonctionnelle
      const s = c.spec;
      const specPage = s
        ? `
      <section class="page page-spec pb">
        <header class="spec-header">
          <div class="page-num">#${num}</div>
          <div>
            <div class="section-tag spec-tag">Spécification fonctionnelle · ${escapeHtml(c.section)}</div>
            <h2>${escapeHtml(c.title)}</h2>
            <div class="path">${escapeHtml(c.path)}</div>
          </div>
        </header>

        <div class="spec-grid">
          <div class="spec-cell">
            <h3>Acteur</h3>
            <p>${escapeHtml(s.acteur)}</p>
          </div>
          <div class="spec-cell">
            <h3>Objectif</h3>
            <p>${escapeHtml(s.objectif)}</p>
          </div>
        </div>

        <h3>Préconditions</h3>
        <ul class="spec-list">${s.preconditions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

        <h3>Parcours nominal</h3>
        <ol class="spec-list spec-flow">${s.parcoursNominal.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>

        <h3>Parcours alternatifs &amp; cas limites</h3>
        <ul class="spec-list">${s.parcoursAlternatifs.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

        <h3>Règles métier</h3>
        <ul class="spec-list spec-rules">${s.regles.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>

        <h3>Post-conditions</h3>
        <p class="spec-postconditions">${escapeHtml(s.postconditions)}</p>
      </section>`
        : "";

      // Page C : audit UX/UI
      const auditPage = `
      <section class="page page-audit pb">
        <header class="audit-header">
          <div class="page-num">#${num}</div>
          <div>
            <div class="section-tag">Audit UX/UI · ${escapeHtml(c.section)}</div>
            <h2>${escapeHtml(c.title)}</h2>
          </div>
        </header>

        <h3><span class="lens lens-ux">UX</span> Parcours, perception, friction</h3>
        <ol class="questions">${uxList}</ol>

        <h3><span class="lens lens-ui">UI</span> Composition, composants, accessibilité</h3>
        <ol class="questions">${uiList}</ol>

        <h3>Notes libres</h3>
        <div class="notes-box">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </section>`;

      return screenshotPage + specPage + auditPage;
    })
    .join("\n");

  const transverseBlocks = TRANSVERSE_AUDIT.blocks
    .map(
      (block) => `
      <div class="transverse-block">
        <h3>${escapeHtml(block.title)}</h3>
        <ol class="questions">
          ${block.items
            .map(
              (it) => `
            <li class="question">
              <div class="question-text">${escapeHtml(it)}</div>
              <div class="answer-lines"><div class="line"></div></div>
            </li>`
            )
            .join("")}
        </ol>
      </div>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Cocooning Club — Audit UX/UI</title>
<style>
  @page { size: A4; margin: 14mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    font-size: 10.5pt;
    line-height: 1.45;
  }
  h1, h2, h3 { color: #111827; margin: 0 0 8px; }
  .page {
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .pb { page-break-before: always; break-before: page; }

  /* Cover */
  .cover { padding-top: 30mm; text-align: center; }
  .cover .brand { font-size: 14pt; letter-spacing: 4px; text-transform: uppercase; color: #9ca3af; }
  .cover h1 { font-size: 30pt; margin: 12mm 0 4mm; }
  .cover .subtitle { font-size: 13pt; color: #4b5563; max-width: 520px; margin: 0 auto; }
  .cover .meta { margin-top: 14mm; color: #6b7280; font-size: 10pt; }
  .cover .howto {
    margin: 14mm auto 0; max-width: 560px; text-align: left;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px;
  }
  .cover .howto h3 { font-size: 12pt; margin-bottom: 6px; text-transform: none; letter-spacing: 0; }
  .cover .howto ul { margin: 0; padding-left: 18px; }
  .cover .howto li { margin-bottom: 4px; }

  /* TOC */
  .toc h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .toc ol, .toc ul { list-style: none; padding: 0; margin: 0; }
  .toc-section {
    margin-top: 12px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 1px; font-size: 9pt;
  }
  .toc-item {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 4px 0; border-bottom: 1px dotted #e5e7eb;
  }
  .toc-path { color: #9ca3af; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9pt; }

  /* Common header */
  .page-num {
    background: #111827; color: white; border-radius: 6px; padding: 4px 10px;
    font-weight: 700; font-size: 12pt; min-width: 38px; text-align: center;
  }
  .section-tag {
    display: inline-block; background: #eef2ff; color: #4338ca;
    padding: 2px 8px; border-radius: 999px; font-size: 9pt; margin-bottom: 4px;
  }
  .path {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #6b7280; font-size: 9.5pt; margin-top: 2px;
  }

  /* Screenshot page (A4 entier dédié à la capture) */
  .page-screenshot {
    display: flex; flex-direction: column; height: 269mm;
  }
  .screenshot-header {
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 8px;
    flex: 0 0 auto;
  }
  .screenshot-title h2 { font-size: 16pt; margin: 0; }
  .screenshot-fullbleed {
    flex: 1 1 auto; display: flex; align-items: flex-start; justify-content: center;
    border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
    background: #f3f4f6; padding: 4px;
  }
  .screenshot-fullbleed img {
    max-width: 100%; max-height: 100%;
    width: auto; height: auto;
    object-fit: contain; display: block;
  }
  .caption {
    flex: 0 0 auto;
    color: #4b5563; font-size: 9.5pt; font-style: italic;
    margin: 6px 0 0; text-align: center;
  }

  /* Spec page (parcours utilisateur en format spécification fonctionnelle) */
  .page-spec .spec-header {
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 10px;
  }
  .page-spec h2 { font-size: 16pt; margin: 0; }
  .page-spec h3 {
    font-size: 9.5pt; margin-top: 9px; margin-bottom: 4px;
    color: #111827; text-transform: uppercase; letter-spacing: 1px;
    border-left: 3px solid #4338ca; padding-left: 8px;
  }
  .spec-tag { background: #e0e7ff; color: #3730a3; }
  .spec-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    margin-bottom: 4px;
  }
  .spec-cell {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 8px 10px;
  }
  .spec-cell h3 {
    border-left: none; padding-left: 0;
    font-size: 8.5pt; margin-top: 0; margin-bottom: 3px;
    color: #6b7280;
  }
  .spec-cell p { margin: 0; font-size: 10pt; }
  .spec-list {
    margin: 0 0 4px; padding-left: 20px; font-size: 10pt;
  }
  .spec-list li { margin-bottom: 3px; }
  .spec-flow {
    counter-reset: step; list-style: none; padding-left: 0;
  }
  .spec-flow li {
    counter-increment: step; position: relative; padding-left: 28px;
    margin-bottom: 4px;
  }
  .spec-flow li::before {
    content: counter(step);
    position: absolute; left: 0; top: 0;
    background: #4338ca; color: white;
    width: 20px; height: 20px;
    border-radius: 50%; font-size: 9pt; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .spec-rules li {
    background: #fefce8; border-left: 2px solid #eab308;
    padding: 2px 8px; list-style-position: inside;
    margin-bottom: 3px; border-radius: 0 3px 3px 0;
  }
  .spec-postconditions {
    background: #ecfdf5; border-left: 3px solid #10b981;
    padding: 6px 10px; border-radius: 0 4px 4px 0;
    margin: 0; font-size: 10pt;
  }

  /* Audit page (questions + notes) */
  .page-audit .audit-header {
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 10px;
  }
  .page-audit h2 { font-size: 16pt; margin: 0; }
  .page-audit h3 {
    font-size: 10pt; margin-top: 10px; margin-bottom: 6px;
    color: #111827; text-transform: uppercase; letter-spacing: 1px;
    display: flex; align-items: center; gap: 8px;
  }
  .lens {
    display: inline-block;
    padding: 1px 7px; border-radius: 4px;
    font-size: 9pt; font-weight: 700; letter-spacing: 0.5px;
  }
  .lens-ux { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }
  .lens-ui { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }

  ol.questions { padding-left: 20px; margin: 0 0 8px; }
  .question { margin-bottom: 6px; page-break-inside: avoid; }
  .question-text { font-weight: 500; }
  .answer-lines .line, .notes-box .line {
    border-bottom: 1px solid #d1d5db; height: 5.5mm;
  }
  .notes-box { margin-top: 4px; }

  /* Transverse final */
  .page-transverse h2 {
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 12px;
  }
  .transverse-block { margin-bottom: 14px; page-break-inside: avoid; }
  .transverse-block h3 {
    font-size: 11pt; text-transform: uppercase; letter-spacing: 1px;
    margin: 10px 0 6px; color: #4338ca;
  }
</style>
</head>
<body>
  <section class="page cover">
    <div class="brand">Cocooning Club</div>
    <h1>Audit UX / UI</h1>
    <p class="subtitle">Pour chaque page : la capture sur une planche A4, puis sur la planche suivante un set de questions UX (parcours, perception, friction) et UI (composition, composants, accessibilité), avec un espace de notes libres.</p>
    <div class="meta">Document généré le ${escapeHtml(today)}</div>
    <div class="howto">
      <h3>Comment l'utiliser ?</h3>
      <ul>
        <li><strong>1ère planche</strong> : capture pleine page de l'écran tel qu'affiché.</li>
        <li><strong>2ème planche</strong> : spécification fonctionnelle (acteur, parcours nominal, alternatifs, règles métier, post-conditions).</li>
        <li><strong>3ème planche</strong> : 4 questions UX, 4 questions UI, et notes libres.</li>
        <li><strong>UX</strong> = ce que ressent et fait l'utilisatrice (heuristiques de Nielsen, JTBD, friction).</li>
        <li><strong>UI</strong> = ce que voit l'utilisatrice (typographie, contraste WCAG, composants, microinteractions).</li>
        <li><strong>Audit transverse</strong> : grille finale couvrant heuristiques, design system, accessibilité et performance.</li>
        <li><em>Note : les captures de l'espace administrateur sont peuplées avec des données factices à des fins de démonstration UI ; les noms et chiffres ne correspondent pas à votre vraie base.</em></li>
      </ul>
    </div>
  </section>

  <section class="page toc pb">
    <h2>Sommaire</h2>
    <ul>${tocItems.join("\n")}</ul>
  </section>

  ${pages}

  <section class="page page-transverse pb">
    <h2>${escapeHtml(TRANSVERSE_AUDIT.title)}</h2>
    ${transverseBlocks}
  </section>
</body>
</html>`;
}

async function htmlToPdf(browser, htmlPath, pdfPath) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "14mm", left: "14mm", right: "14mm" },
  });
  await context.close();
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true });
  if (!existsSync(CHROMIUM_PATH)) {
    throw new Error(`Chromium introuvable à ${CHROMIUM_PATH}. Lancez "npx playwright install chromium".`);
  }

  await buildSite();
  const dev = startPreviewServer();
  try {
    await waitForServer(BASE_URL);
    log("Serveur prêt.");

    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    try {
      const captures = await captureScreenshots(browser);
      log(`Captures terminées (${captures.length}).`);

      const html = buildHtml(captures);
      await writeFile(HTML_PATH, html, "utf-8");
      log(`HTML écrit : ${HTML_PATH}`);

      await htmlToPdf(browser, HTML_PATH, PDF_PATH);
      log(`PDF généré : ${PDF_PATH}`);
    } finally {
      await browser.close();
    }
  } finally {
    dev.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
