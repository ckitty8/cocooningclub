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

  // Pré-charge la session admin dans localStorage pour les routes /admin,
  // mais l'efface pour les pages publiques (sinon /login, /forgot-password
  // redirigent immédiatement vers /admin/dashboard).
  const supabaseUrl = STUB_ENV.VITE_SUPABASE_URL;
  const seed = buildAuthLocalStorage(supabaseUrl);
  await context.addInitScript(({ key, value }) => {
    try {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) {
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

      // Page B : audit UX/UI
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

      return screenshotPage + auditPage;
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
        <li><strong>Pages paires</strong> : capture pleine page de l'écran tel qu'affiché.</li>
        <li><strong>Pages impaires</strong> : 4 questions UX, 4 questions UI, et notes libres.</li>
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
