import type { Profile, UserRole } from "@/contexts/auth";

// Rôles du site, droits d'accès aux pages et matrice des rôles.
//
// Source unique : les gardes de routes (App.tsx) utilisent les listes `ACCES`,
// et la matrice affichée au créateur est construite à partir de ces mêmes
// listes. Si l'on change l'accès à une zone, la matrice suit.

/** Rôles stockés en base (enum role_utilisateur) + le créateur. */
export type RoleSite = UserRole | "createur";

/** Rôles que le créateur peut simuler (le visiteur non connecté s'obtient en navigation privée). */
export type RoleSimulable = Exclude<RoleSite, "createur">;

export const ORDRE_ROLES: readonly RoleSite[] = ["inscrit", "membre", "administrateur", "createur"];
export const ROLES_SIMULABLES: readonly RoleSimulable[] = ["inscrit", "membre", "administrateur"];

interface InfosRole {
  libelle: string;
  description: string;
}

export const ROLES: Record<RoleSite, InfosRole> = {
  inscrit: {
    libelle: "Inscrit",
    description: "Compte créé (rôle par défaut à l'inscription). Se pré-inscrit aux ateliers depuis le site public, mais n'a pas accès à l'espace membre.",
  },
  membre: {
    libelle: "Membre",
    description: "Adhérente du club. Accède à l'espace membre et aux documents réservés aux membres.",
  },
  administrateur: {
    libelle: "Administrateur",
    description: "Équipe du club : gère les membres, les ateliers, les pré-inscriptions, les documents et le site.",
  },
  createur: {
    libelle: "Créateur",
    description: "Compte unique du créateur du site : tous les droits de l'administrateur, plus le simulateur de rôle et la matrice des rôles.",
  },
};

/** Rôles autorisés dans chaque zone protégée du site. */
export const ACCES = {
  espaceMembre: ["membre", "administrateur", "createur"],
  admin: ["administrateur", "createur"],
  createur: ["createur"],
} as const satisfies Record<string, readonly RoleSite[]>;

// ── Rôle d'un compte ─────────────────────────────────────

/**
 * Adresse du créateur du site. Le rôle créateur n'existe pour aucune autre
 * adresse et n'est stocké nulle part : il est déduit de l'email du compte de
 * connexion.
 */
export const EMAIL_CREATEUR = "christellelab@gmail.com";

/**
 * Rôle réel d'un compte. Le créateur est l'administratrice active dont
 * l'email de connexion est EMAIL_CREATEUR. On teste l'email du compte
 * d'authentification (`user.email`, vérifié par Supabase), pas celui du
 * profil, que la personne peut modifier elle-même.
 * Le créateur reste `administrateur` en base : il garde donc les droits
 * d'administration que la base lui donne déjà.
 */
export const roleReelDe = (
  profil: Pick<Profile, "role" | "est_actif">,
  emailConnexion: string | null | undefined,
): RoleSite =>
  profil.role === "administrateur" && profil.est_actif && emailConnexion?.trim().toLowerCase() === EMAIL_CREATEUR
    ? "createur"
    : profil.role;

/** Rôle avec lequel le site se comporte : la simulation ne vaut que pour le créateur. */
export const roleEffectif = (roleReel: RoleSite | null, simulation: RoleSimulable | null): RoleSite | null =>
  roleReel === "createur" && simulation ? simulation : roleReel;

export const estRoleSimulable = (valeur: unknown): valeur is RoleSimulable =>
  ROLES_SIMULABLES.includes(valeur as RoleSimulable);

/** Page d'arrivée après connexion ou au début d'une simulation. */
export const pageAccueilDuRole = (role: RoleSite | null): string => {
  if (role === "administrateur" || role === "createur") return "/admin/dashboard";
  // L'inscrit n'a pas d'espace membre : il retrouve les ateliers du site public.
  if (role === "inscrit") return "/calendrier";
  return "/espace-membre";
};

// ── Matrice des rôles ────────────────────────────────────

/** Colonnes de la matrice : le visiteur (non connecté) puis chaque rôle. */
export type ColonneMatrice = "visiteur" | RoleSite;
export const COLONNES_MATRICE: readonly ColonneMatrice[] = ["visiteur", ...ORDRE_ROLES];

const TOUS: readonly ColonneMatrice[] = COLONNES_MATRICE;
const CONNECTES: readonly ColonneMatrice[] = ORDRE_ROLES;

export interface LigneMatrice {
  libelle: string;
  /** Précision affichée sous le libellé. */
  detail?: string;
  /** Colonnes qui ont accès. */
  acces: readonly ColonneMatrice[];
}

export interface SectionMatrice {
  titre: string;
  description: string;
  lignes: readonly LigneMatrice[];
}

export const MATRICE: readonly SectionMatrice[] = [
  {
    titre: "Site public",
    description: "Accessible sans compte.",
    lignes: [
      { libelle: "Accueil, Notre histoire, Calendrier", acces: TOUS },
      { libelle: "Se pré-inscrire à un atelier", detail: "Rattachée au compte quand la personne est connectée (inscrit compris).", acces: TOUS },
      { libelle: "Ajouter un atelier à son agenda", acces: TOUS },
      { libelle: "Écrire au club (formulaire de contact)", acces: TOUS },
    ],
  },
  {
    titre: "Espace membre",
    description: "Pages /espace-membre, réservées aux membres et à l'équipe (pas aux simples inscrits).",
    lignes: [
      { libelle: "Tableau de bord", acces: ACCES.espaceMembre },
      { libelle: "Ateliers", acces: ACCES.espaceMembre },
      { libelle: "Mes inscriptions", acces: ACCES.espaceMembre },
      { libelle: "Mon adhésion", detail: "Récapitulatif et bulletin d'adhésion.", acces: ACCES.espaceMembre },
      { libelle: "Documents", acces: ACCES.espaceMembre },
      { libelle: "Boîte à idées", acces: ACCES.espaceMembre },
      { libelle: "Mon compte", acces: ACCES.espaceMembre },
    ],
  },
  {
    titre: "Administration",
    description: "Pages /admin, réservées à l'équipe.",
    lignes: [
      { libelle: "Tableau de bord", acces: ACCES.admin },
      { libelle: "Membres", acces: ACCES.admin },
      { libelle: "Offre & adhésions", detail: "Formules d'adhésion, validation des adhésions.", acces: ACCES.admin },
      { libelle: "Ateliers", acces: ACCES.admin },
      { libelle: "Pré-inscriptions", acces: ACCES.admin },
      { libelle: "Gestion des dispo des admins", acces: ACCES.admin },
      { libelle: "Boîte à idées", acces: ACCES.admin },
      { libelle: "Témoignages", acces: ACCES.admin },
      { libelle: "Documents", acces: ACCES.admin },
      { libelle: "Formulaire de contact", acces: ACCES.admin },
      { libelle: "Modèles de messages", acces: ACCES.admin },
      { libelle: "Mon compte", acces: ACCES.admin },
    ],
  },
  {
    titre: "Espace créateur",
    description: "Outils du créateur du site, dans le menu d'administration.",
    lignes: [
      { libelle: "Simulateur de rôle", acces: ACCES.createur },
      { libelle: "Matrice des rôles", acces: ACCES.createur },
    ],
  },
  {
    titre: "Actions protégées par la base de données",
    description: "Appliquées par Supabase (règles RLS et déclencheurs), quelle que soit la page utilisée.",
    lignes: [
      { libelle: "Annuler sa propre inscription", acces: CONNECTES },
      { libelle: "Publier un témoignage", detail: "Après un atelier auquel la personne a participé ; publié après modération.", acces: CONNECTES },
      { libelle: "Valider une pré-inscription, marquer payée ou présente", acces: ACCES.admin },
      { libelle: "Modérer les témoignages", acces: ACCES.admin },
      { libelle: "Changer le rôle, l'état ou l'abonnement d'un compte", acces: ACCES.admin },
      {
        libelle: "Devenir créateur",
        detail: "Réservé à une seule adresse, inscrite dans le code du site : personne ne peut l'obtenir depuis le site.",
        acces: [],
      },
    ],
  },
];
