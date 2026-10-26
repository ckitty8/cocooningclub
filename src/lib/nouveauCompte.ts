import type { UserRole } from "@/contexts/auth";

// Données et règles d'un compte créé par l'équipe (partagées par « Membres » et « Ajouter une adhésion »).
// Le rôle `membre` n'est jamais attribué ici : il vient de la validation d'une adhésion (migration 20261026000000).

export interface NouveauCompte {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  role: Exclude<UserRole, "membre">;
  /** Actif : un compte de connexion est créé (mail de confirmation). Inactif : fiche seule, aucun mail. */
  est_actif: boolean;
  mot_de_passe?: string;
  debut_abonnement?: string;
  fin_abonnement?: string;
  commune?: string;
  activite?: string;
}

export const MOT_DE_PASSE_MIN = 6;

/** Message d'erreur à afficher, ou null si le formulaire est valide. */
export const validerNouveauCompte = (c: NouveauCompte): string | null => {
  if (!c.email.trim() || !c.prenom.trim() || !c.nom.trim()) return "Prénom, nom et email sont obligatoires.";
  // Le mot de passe n'est requis que si on active le compte (signUp Supabase).
  if (c.est_actif) {
    if (!c.mot_de_passe) return "Le mot de passe est obligatoire pour activer le compte.";
    if (c.mot_de_passe.length < MOT_DE_PASSE_MIN) return `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`;
  }
  return null;
};
