// Fausses données + intercepteur réseau pour générer le PDF d'audit UX/UI
// sans accès à Supabase (sandbox sans réseau sortant). Utilisé uniquement par
// scripts/generate-feedback-pdf.mjs ; n'a aucun impact sur l'app de production.

const ADMIN_ID = "00000000-0000-0000-0000-00000000a001";
const ACCESS_TOKEN = "fake-access-token";
const REFRESH_TOKEN = "fake-refresh-token";

const today = new Date();
const isoDay = (offsetDays = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const isoTs = (offsetDays = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

const FAKE_USER = {
  id: ADMIN_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "christelle@cocooningclub.fr",
  email_confirmed_at: isoTs(-365),
  phone: "",
  confirmed_at: isoTs(-365),
  last_sign_in_at: isoTs(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { prenom: "Christelle" },
  identities: [],
  created_at: isoTs(-365),
  updated_at: isoTs(),
};

const FAKE_SESSION = {
  access_token: ACCESS_TOKEN,
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: REFRESH_TOKEN,
  user: FAKE_USER,
};

// ----- Fixtures par table -----

const utilisateurs = [
  {
    id: ADMIN_ID,
    prenom: "Christelle",
    nom: "Lab",
    email: "christelle@cocooningclub.fr",
    telephone: "06 12 34 56 78",
    date_naissance: "1978-03-22",
    url_avatar: null,
    debut_abonnement: null,
    fin_abonnement: null,
    role: "administrateur",
    est_actif: true,
    couleur_conges: "Rose poudré",
    code_couleur_conges: "#fbcfe8",
    cree_le: isoTs(-400),
  },
  {
    id: "00000000-0000-0000-0000-00000000a002",
    prenom: "Sophie",
    nom: "Marchand",
    email: "sophie.marchand@example.com",
    telephone: "06 23 45 67 89",
    date_naissance: "1985-07-14",
    url_avatar: null,
    debut_abonnement: isoDay(-180),
    fin_abonnement: isoDay(185),
    role: "membre_premium",
    est_actif: true,
    couleur_conges: "Sauge",
    code_couleur_conges: "#bbf7d0",
    cree_le: isoTs(-200),
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    prenom: "Camille",
    nom: "Roux",
    email: "camille.roux@example.com",
    telephone: "06 34 56 78 90",
    date_naissance: "1991-11-02",
    url_avatar: null,
    debut_abonnement: isoDay(-90),
    fin_abonnement: isoDay(275),
    role: "membre",
    est_actif: true,
    couleur_conges: null,
    code_couleur_conges: null,
    cree_le: isoTs(-100),
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    prenom: "Léa",
    nom: "Bernard",
    email: "lea.bernard@example.com",
    telephone: "06 45 67 89 01",
    date_naissance: "1989-02-10",
    url_avatar: null,
    debut_abonnement: null,
    fin_abonnement: null,
    role: "inscrit",
    est_actif: true,
    couleur_conges: null,
    code_couleur_conges: null,
    cree_le: isoTs(-30),
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    prenom: "Manon",
    nom: "Petit",
    email: "manon.petit@example.com",
    telephone: "06 56 78 90 12",
    date_naissance: "1976-05-19",
    url_avatar: null,
    debut_abonnement: isoDay(-365),
    fin_abonnement: isoDay(-30),
    role: "membre",
    est_actif: false,
    couleur_conges: null,
    code_couleur_conges: null,
    cree_le: isoTs(-365),
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    prenom: "Julie",
    nom: "Dubois",
    email: "julie.dubois@example.com",
    telephone: "06 67 89 01 23",
    date_naissance: "1982-09-08",
    url_avatar: null,
    debut_abonnement: isoDay(-15),
    fin_abonnement: isoDay(350),
    role: "membre_premium",
    est_actif: true,
    couleur_conges: null,
    code_couleur_conges: null,
    cree_le: isoTs(-15),
  },
];

const ateliers = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    titre: "Atelier sophrologie & gratitude",
    description:
      "Une parenthèse douce pour cultiver la gratitude par la respiration et la visualisation guidée.",
    date_atelier: isoDay(3),
    heure_debut: "14:30",
    heure_fin: "16:00",
    lieu: "Studio cocon, Saint-Cloud",
    places_max: 12,
    places_disponibles: 4,
    statut: "publie",
    type: "bien-etre",
    prix: 28,
    cree_le: isoTs(-30),
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    titre: "Cercle de parole entre femmes",
    description:
      "Un espace confidentiel pour partager, écouter et se sentir reliée. Animatrice : Élise.",
    date_atelier: isoDay(7),
    heure_debut: "19:00",
    heure_fin: "21:00",
    lieu: "Salon du club",
    places_max: 10,
    places_disponibles: 0,
    statut: "complet",
    type: "lien",
    prix: 22,
    cree_le: isoTs(-25),
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    titre: "Yoga doux du matin",
    description: "Réveil corporel en douceur — accessible à toutes, débutantes bienvenues.",
    date_atelier: isoDay(10),
    heure_debut: "09:30",
    heure_fin: "10:45",
    lieu: "Studio cocon, Saint-Cloud",
    places_max: 14,
    places_disponibles: 9,
    statut: "publie",
    type: "bien-etre",
    prix: 18,
    cree_le: isoTs(-20),
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    titre: "Atelier écriture créative",
    description: "Cinq exercices pour libérer son écriture et oser la première phrase.",
    date_atelier: isoDay(14),
    heure_debut: "14:00",
    heure_fin: "16:30",
    lieu: "Salon du club",
    places_max: 8,
    places_disponibles: 5,
    statut: "publie",
    type: "creatif",
    prix: 32,
    cree_le: isoTs(-12),
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    titre: "Brunch cocooning de printemps",
    description: "Un moment gourmand et chaleureux pour rencontrer la communauté.",
    date_atelier: isoDay(21),
    heure_debut: "11:00",
    heure_fin: "14:00",
    lieu: "Jardin du club",
    places_max: 25,
    places_disponibles: 18,
    statut: "publie",
    type: "rencontre",
    prix: 35,
    cree_le: isoTs(-8),
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    titre: "Méditation guidée — pleine lune",
    description: "Atelier passé. Brouillon archivé.",
    date_atelier: isoDay(-7),
    heure_debut: "20:00",
    heure_fin: "21:15",
    lieu: "Studio cocon",
    places_max: 12,
    places_disponibles: 0,
    statut: "passe",
    type: "bien-etre",
    prix: 22,
    cree_le: isoTs(-40),
  },
  {
    id: "10000000-0000-0000-0000-000000000007",
    titre: "Atelier bougies & senteurs",
    description: "Création de bougies parfumées personnalisées (brouillon, à valider).",
    date_atelier: isoDay(28),
    heure_debut: "15:00",
    heure_fin: "17:30",
    lieu: "Atelier annexe",
    places_max: 10,
    places_disponibles: 10,
    statut: "brouillon",
    type: "creatif",
    prix: 42,
    cree_le: isoTs(-2),
  },
];

const inscriptions = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    atelier_id: ateliers[0].id,
    utilisateur_id: utilisateurs[1].id,
    prenom_invite: "Sophie",
    nom_invite: "Marchand",
    email_invite: "sophie.marchand@example.com",
    telephone_invite: "06 23 45 67 89",
    statut: "confirme",
    present: null,
    inscrit_le: isoTs(-2),
    annule_le: null,
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    atelier_id: ateliers[0].id,
    utilisateur_id: null,
    prenom_invite: "Aurélie",
    nom_invite: "Garnier",
    email_invite: "aurelie.garnier@example.com",
    telephone_invite: "06 78 90 12 34",
    statut: "en_attente",
    present: null,
    inscrit_le: isoTs(-1),
    annule_le: null,
  },
  {
    id: "20000000-0000-0000-0000-000000000003",
    atelier_id: ateliers[3].id,
    utilisateur_id: utilisateurs[2].id,
    prenom_invite: "Camille",
    nom_invite: "Roux",
    email_invite: "camille.roux@example.com",
    telephone_invite: "06 34 56 78 90",
    statut: "en_attente",
    present: null,
    inscrit_le: isoTs(-1),
    annule_le: null,
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    atelier_id: ateliers[2].id,
    utilisateur_id: utilisateurs[3].id,
    prenom_invite: "Léa",
    nom_invite: "Bernard",
    email_invite: "lea.bernard@example.com",
    telephone_invite: "06 45 67 89 01",
    statut: "confirme",
    present: null,
    inscrit_le: isoTs(-3),
    annule_le: null,
  },
  {
    id: "20000000-0000-0000-0000-000000000005",
    atelier_id: ateliers[4].id,
    utilisateur_id: null,
    prenom_invite: "Hélène",
    nom_invite: "Vasseur",
    email_invite: "helene.vasseur@example.com",
    telephone_invite: "06 89 01 23 45",
    statut: "en_attente",
    present: null,
    inscrit_le: isoTs(0),
    annule_le: null,
  },
  {
    id: "20000000-0000-0000-0000-000000000006",
    atelier_id: ateliers[5].id,
    utilisateur_id: utilisateurs[5].id,
    prenom_invite: "Julie",
    nom_invite: "Dubois",
    email_invite: "julie.dubois@example.com",
    telephone_invite: "06 67 89 01 23",
    statut: "annule",
    present: false,
    inscrit_le: isoTs(-12),
    annule_le: isoTs(-9),
  },
];

const contact_messages = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    nom: "Marie",
    prenom: "Lefèvre",
    email: "marie.lefevre@example.com",
    sujet: "Demande d'information sur les ateliers",
    message:
      "Bonjour, je découvre votre site et j'aimerais savoir si vos ateliers sont accessibles aux débutantes complètes. Merci !",
    lu: false,
    created_at: isoTs(-1),
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    nom: "Anne",
    prenom: "Schmitt",
    email: "anne.schmitt@example.com",
    sujet: "Réservation atelier sophrologie",
    message: "Bonjour, j'ai du mal à valider ma réservation pour l'atelier de samedi.",
    lu: false,
    created_at: isoTs(-2),
  },
  {
    id: "30000000-0000-0000-0000-000000000003",
    nom: "Patricia",
    prenom: "Morel",
    email: "patricia.morel@example.com",
    sujet: "Remerciements",
    message: "Merci pour le brunch d'hier, c'était un magnifique moment !",
    lu: true,
    created_at: isoTs(-7),
  },
];

const documents = [
  {
    id: "40000000-0000-0000-0000-000000000001",
    titre: "Magazine de printemps 2026",
    description: "Numéro de saison : 24 pages d'inspirations, recettes et témoignages.",
    type: "magazine",
    fichier_url: null,
    fichier_chemin: "documents/magazine-printemps-2026.pdf",
    lien_externe: null,
    acces: "tous",
    created_at: isoTs(-15),
  },
  {
    id: "40000000-0000-0000-0000-000000000002",
    titre: "Guide « Premiers pas au club »",
    description: "Tout ce qu'il faut savoir pour profiter pleinement de votre adhésion.",
    type: "guide",
    fichier_url: null,
    fichier_chemin: "documents/guide-premiers-pas.pdf",
    lien_externe: null,
    acces: "membres",
    created_at: isoTs(-90),
  },
  {
    id: "40000000-0000-0000-0000-000000000003",
    titre: "Guide « Méditation pour débutantes »",
    description: "12 exercices guidés à pratiquer chez soi entre les ateliers.",
    type: "guide",
    fichier_url: null,
    fichier_chemin: "documents/guide-meditation.pdf",
    lien_externe: null,
    acces: "premium",
    created_at: isoTs(-45),
  },
  {
    id: "40000000-0000-0000-0000-000000000004",
    titre: "Article — « 5 rituels du soir »",
    description: "Article externe partagé par notre intervenante sophrologue.",
    type: "lien_externe",
    fichier_url: null,
    fichier_chemin: null,
    lien_externe: "https://example.com/rituels-du-soir",
    acces: "tous",
    created_at: isoTs(-5),
  },
];

const idees = [
  {
    id: "50000000-0000-0000-0000-000000000001",
    utilisateur_id: utilisateurs[1].id,
    titre: "Atelier d'aquarelle pour débutantes",
    description:
      "J'aimerais beaucoup une initiation à l'aquarelle, en petit groupe, sans pression de résultat.",
    categorie: "ateliers",
    cree_le: isoTs(-10),
  },
  {
    id: "50000000-0000-0000-0000-000000000002",
    utilisateur_id: utilisateurs[2].id,
    titre: "Soirée jeux de société entre membres",
    description: "Une soirée détente, chacune apporte un jeu favori.",
    categorie: "evenements",
    cree_le: isoTs(-22),
  },
  {
    id: "50000000-0000-0000-0000-000000000003",
    utilisateur_id: utilisateurs[3].id,
    titre: "Newsletter mensuelle des coulisses",
    description: "Une newsletter mensuelle qui partage les coulisses du club.",
    categorie: "communication",
    cree_le: isoTs(-3),
  },
  {
    id: "50000000-0000-0000-0000-000000000004",
    utilisateur_id: utilisateurs[5].id,
    titre: "Bouton « Mes prochains ateliers » sur l'accueil",
    description:
      "Pour retrouver rapidement mes inscriptions sans passer par mon espace.",
    categorie: "evolution_site",
    cree_le: isoTs(-12),
  },
  {
    id: "50000000-0000-0000-0000-000000000005",
    utilisateur_id: utilisateurs[3].id,
    titre: "Page calendrier illisible sur mobile",
    description:
      "Sur mon iPhone, les filtres se chevauchent et le scroll horizontal coupe les boutons.",
    categorie: "anomalie_site",
    cree_le: isoTs(-1),
  },
  {
    id: "50000000-0000-0000-0000-000000000006",
    utilisateur_id: utilisateurs[1].id,
    titre: "Café littéraire mensuel",
    description: "Échange autour d'un livre choisi ensemble. Format 1h30.",
    categorie: "ateliers",
    cree_le: isoTs(-60),
  },
];

const idee_reactions = [
  {
    id: "60000000-0000-0000-0000-000000000001",
    idee_id: idees[0].id,
    utilisateur_id: utilisateurs[0].id,
    reaction: "valide",
    cree_le: isoTs(-9),
  },
  {
    id: "60000000-0000-0000-0000-000000000002",
    idee_id: idees[1].id,
    utilisateur_id: utilisateurs[0].id,
    reaction: "a_discuter",
    cree_le: isoTs(-21),
  },
  {
    id: "60000000-0000-0000-0000-000000000003",
    idee_id: idees[3].id,
    utilisateur_id: utilisateurs[0].id,
    reaction: "valide",
    cree_le: isoTs(-11),
  },
  {
    id: "60000000-0000-0000-0000-000000000004",
    idee_id: idees[5].id,
    utilisateur_id: utilisateurs[0].id,
    reaction: "non_valide",
    cree_le: isoTs(-58),
  },
];

const parametres_messages = [
  {
    id: "70000000-0000-0000-0000-000000000001",
    cle: "email_confirmation_inscription",
    libelle: "Email — confirmation d'inscription",
    valeur:
      "Bonjour {{prenom}},\n\nVotre inscription à l'atelier « {{titre_atelier}} » du {{date_atelier}} est confirmée. Nous avons hâte de vous accueillir !\n\nÀ très bientôt,\nL'équipe Cocooning Club",
    canal: "email",
    cree_le: isoTs(-200),
  },
  {
    id: "70000000-0000-0000-0000-000000000002",
    cle: "email_relance_pre_inscription",
    libelle: "Email — relance pré-inscription",
    valeur:
      "Bonjour {{prenom}},\n\nNous avons bien reçu votre pré-inscription pour « {{titre_atelier}} ». Pour confirmer votre place, merci de finaliser votre paiement dans les 48h via le lien suivant : {{lien_paiement}}.\n\nDouce journée,\nCocooning Club",
    canal: "email",
    cree_le: isoTs(-180),
  },
  {
    id: "70000000-0000-0000-0000-000000000003",
    cle: "sms_rappel_atelier",
    libelle: "SMS — rappel veille d'atelier",
    valeur:
      "Cocooning Club : rendez-vous demain à {{heure_debut}} pour « {{titre_atelier}} » au {{lieu}}. À demain !",
    canal: "sms",
    cree_le: isoTs(-150),
  },
  {
    id: "70000000-0000-0000-0000-000000000004",
    cle: "email_bienvenue_membre",
    libelle: "Email — bienvenue nouvelle membre",
    valeur:
      "Bonjour {{prenom}},\n\nBienvenue dans le Cocooning Club ! Votre adhésion est active jusqu'au {{fin_abonnement}}. Découvrez nos ateliers à venir sur votre espace membre.\n\nAvec douceur,\nChristelle",
    canal: "email",
    cree_le: isoTs(-120),
  },
];

const disponibilites = [
  { id: "80000000-0000-0000-0000-000000000001", utilisateur_id: ADMIN_ID, jour: 1, heure_debut: "10:00", heure_fin: "12:00" },
  { id: "80000000-0000-0000-0000-000000000002", utilisateur_id: ADMIN_ID, jour: 1, heure_debut: "14:00", heure_fin: "18:00" },
  { id: "80000000-0000-0000-0000-000000000003", utilisateur_id: ADMIN_ID, jour: 2, heure_debut: "09:30", heure_fin: "12:30" },
  { id: "80000000-0000-0000-0000-000000000004", utilisateur_id: ADMIN_ID, jour: 3, heure_debut: "14:00", heure_fin: "19:00" },
  { id: "80000000-0000-0000-0000-000000000005", utilisateur_id: ADMIN_ID, jour: 4, heure_debut: "10:00", heure_fin: "12:00" },
  { id: "80000000-0000-0000-0000-000000000006", utilisateur_id: ADMIN_ID, jour: 5, heure_debut: "14:00", heure_fin: "17:00" },
  { id: "80000000-0000-0000-0000-000000000007", utilisateur_id: ADMIN_ID, jour: 6, heure_debut: "10:00", heure_fin: "13:00" },
];

const indisponibilites = [
  {
    id: "90000000-0000-0000-0000-000000000001",
    utilisateur_id: ADMIN_ID,
    motif: "Vacances de printemps",
    date_debut: isoDay(60),
    date_fin: isoDay(74),
  },
  {
    id: "90000000-0000-0000-0000-000000000002",
    utilisateur_id: ADMIN_ID,
    motif: "Week-end famille",
    date_debut: isoDay(35),
    date_fin: isoDay(36),
  },
];

const jours_feries = [
  { id: "a0000000-0000-0000-0000-000000000001", nom: "Pâques", date: isoDay(20) },
  { id: "a0000000-0000-0000-0000-000000000002", nom: "Fête du travail", date: "2026-05-01" },
  { id: "a0000000-0000-0000-0000-000000000003", nom: "Victoire 1945", date: "2026-05-08" },
  { id: "a0000000-0000-0000-0000-000000000004", nom: "Ascension", date: "2026-05-14" },
  { id: "a0000000-0000-0000-0000-000000000005", nom: "Pentecôte", date: "2026-05-25" },
];

const vacances_scolaires = [
  { id: "b0000000-0000-0000-0000-000000000001", zone: "C", nom: "Printemps", date_debut: isoDay(50), date_fin: isoDay(64) },
  { id: "b0000000-0000-0000-0000-000000000002", zone: "C", nom: "Été", date_debut: "2026-07-04", date_fin: "2026-09-01" },
  { id: "b0000000-0000-0000-0000-000000000003", zone: "C", nom: "Toussaint", date_debut: "2026-10-17", date_fin: "2026-11-02" },
];

const visites_site = Array.from({ length: 60 }).map((_, i) => ({
  id: `c0000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
  date: isoDay(-i),
  visites: 35 + Math.floor(Math.random() * 80),
}));

export const FAKE_DATA = {
  utilisateurs,
  ateliers,
  inscriptions,
  contact_messages,
  documents,
  idees,
  idee_reactions,
  parametres_messages,
  disponibilites,
  indisponibilites,
  jours_feries,
  vacances_scolaires,
  visites_site,
};

// ----- Filtre des requêtes PostgREST -----

function applyFilter(rows, key, value) {
  // Ex: "eq.administrateur", "in.(publie,complet)", "gte.2026-05-01"
  const dot = value.indexOf(".");
  if (dot === -1) return rows;
  const op = value.slice(0, dot);
  const arg = value.slice(dot + 1);

  switch (op) {
    case "eq":
      return rows.filter((r) => String(r[key] ?? "") === arg);
    case "neq":
      return rows.filter((r) => String(r[key] ?? "") !== arg);
    case "in": {
      const list = arg
        .replace(/^\(/, "")
        .replace(/\)$/, "")
        .split(",")
        .map((s) => s.trim());
      return rows.filter((r) => list.includes(String(r[key] ?? "")));
    }
    case "gte":
      return rows.filter((r) => r[key] != null && String(r[key]) >= arg);
    case "lte":
      return rows.filter((r) => r[key] != null && String(r[key]) <= arg);
    case "gt":
      return rows.filter((r) => r[key] != null && String(r[key]) > arg);
    case "lt":
      return rows.filter((r) => r[key] != null && String(r[key]) < arg);
    case "is":
      if (arg === "null") return rows.filter((r) => r[key] == null);
      if (arg === "true") return rows.filter((r) => r[key] === true);
      if (arg === "false") return rows.filter((r) => r[key] === false);
      return rows;
    default:
      return rows;
  }
}

function applyOrder(rows, value) {
  // Ex: "date_atelier", "inscrit_le.desc", "cree_le.asc"
  if (!value) return rows;
  const [col, dir = "asc"] = value.split(".");
  const sorted = [...rows].sort((a, b) => {
    const av = a[col] ?? "";
    const bv = b[col] ?? "";
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

// Embeds : `?select=*,ateliers(titre,date_atelier)` → joindre la table par FK
const EMBED_RESOLVERS = {
  ateliers: (row) => FAKE_DATA.ateliers.find((a) => a.id === row.atelier_id) ?? null,
  utilisateurs: (row) =>
    FAKE_DATA.utilisateurs.find((u) => u.id === row.utilisateur_id) ?? null,
};

function applyEmbeds(rows, selectParam) {
  if (!selectParam) return rows;
  // Trouve les embeds : "ateliers(titre,date_atelier)"
  const embedMatches = [...selectParam.matchAll(/(\w+)\(([^)]*)\)/g)];
  if (embedMatches.length === 0) return rows;
  return rows.map((row) => {
    const next = { ...row };
    for (const [, name] of embedMatches) {
      const resolver = EMBED_RESOLVERS[name];
      if (resolver) next[name] = resolver(row);
    }
    return next;
  });
}

function queryTable(table, urlSearchParams) {
  const rows0 = FAKE_DATA[table] ?? [];
  let rows = [...rows0];
  for (const [key, value] of urlSearchParams) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    rows = applyFilter(rows, key, value);
  }
  rows = applyEmbeds(rows, urlSearchParams.get("select"));
  rows = applyOrder(rows, urlSearchParams.get("order"));
  const limit = urlSearchParams.get("limit");
  if (limit) rows = rows.slice(0, parseInt(limit, 10));
  return rows;
}

// ----- Branchement Playwright -----

// Headers CORS communs à toutes les réponses : sans Access-Control-Expose-Headers,
// le navigateur cross-origin masque "content-range" à supabase-js et la propriété
// `count` reste undefined (donc 0 dans le dashboard).
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-credentials": "true",
  "access-control-expose-headers":
    "content-range, content-length, content-type, x-total-count, range",
};

export async function attachSupabaseMock(context, log = () => {}) {
  await context.route(/.*\.supabase\.co\/.*/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    log(`[mock] ${method} ${path}${url.search}`);

    // Préflight CORS
    if (method === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,HEAD,OPTIONS",
          "access-control-allow-headers":
            "authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, range, x-client-info",
        },
        body: "",
      });
    }

    const respond = (status, body, extraHeaders = {}) =>
      route.fulfill({
        status,
        headers: {
          ...CORS_HEADERS,
          "content-type": "application/json",
          ...extraHeaders,
        },
        body,
      });

    // ---- AUTH ----
    if (path.startsWith("/auth/v1/token")) {
      return respond(200, JSON.stringify(FAKE_SESSION));
    }
    if (path.startsWith("/auth/v1/user")) {
      return respond(200, JSON.stringify(FAKE_USER));
    }
    if (path.startsWith("/auth/v1/logout")) {
      return respond(204, "");
    }
    if (path.startsWith("/auth/v1/")) {
      return respond(200, "{}");
    }

    // ---- REST RPC ----
    if (path.startsWith("/rest/v1/rpc/")) {
      return respond(200, "[]");
    }

    // ---- REST ----
    if (path.startsWith("/rest/v1/")) {
      const table = path.replace("/rest/v1/", "").split("/")[0];
      const accept = req.headers()["accept"] || "";

      // Mutations (POST/PATCH/DELETE) : on fait semblant que ça a marché.
      if (method === "POST" || method === "PATCH" || method === "DELETE") {
        return respond(200, "[]", { "content-range": "0-0/1" });
      }

      const rows = queryTable(table, url.searchParams);
      const total = rows.length;
      const limit = parseInt(url.searchParams.get("limit") || String(total), 10);
      const visible = Math.max(0, Math.min(limit, total));
      const contentRange = `${total === 0 ? "*" : `0-${visible - 1}`}/${total}`;

      // HEAD : Content-Range seul, body vide (Supabase JS lit `count` depuis ce header).
      if (method === "HEAD") {
        return respond(200, "", { "content-range": contentRange });
      }

      // single() → un seul objet (Accept includes "object+json")
      if (accept.includes("object+json")) {
        return respond(200, JSON.stringify(rows[0] ?? null), {
          "content-range": contentRange,
        });
      }

      return respond(200, JSON.stringify(rows), { "content-range": contentRange });
    }

    // Storage : on simule l'absence de fichier
    if (path.startsWith("/storage/v1/")) {
      return respond(200, "{}");
    }

    // Tout le reste : 200 vide
    return respond(200, "{}");
  });

  // Realtime websocket : on coupe net pour éviter les retries qui spamment.
  await context.route(/.*\.supabase\.co\/realtime\/.*/, (route) => route.abort());
}

// localStorage seed : Supabase JS lit la session depuis localStorage en clé
// `sb-<project-ref>-auth-token`. Pour court-circuiter le login on peut injecter
// directement la session avant la première navigation.
export function buildAuthLocalStorage(supabaseUrl) {
  const projectRef = (() => {
    try {
      return new URL(supabaseUrl).hostname.split(".")[0];
    } catch {
      return "stub";
    }
  })();
  return {
    key: `sb-${projectRef}-auth-token`,
    value: JSON.stringify(FAKE_SESSION),
  };
}
