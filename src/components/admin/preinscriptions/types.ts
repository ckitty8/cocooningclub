export type StatutInscription = "en_attente" | "confirme" | "annule";
export type StatutPaiement = "en_attente" | "paye" | "non_requis";

export interface Inscription {
  id: string;
  atelier_id: string;
  utilisateur_id: string | null;
  prenom_invite: string | null;
  nom_invite: string | null;
  email_invite: string | null;
  telephone_invite: string | null;
  date_naissance: string | null;
  statut: StatutInscription;
  statut_paiement: StatutPaiement;
  inscrit_le: string;
  ateliers?: {
    id: string;
    titre: string;
    date_atelier: string;
    heure_debut: string;
    lieu: string | null;
    adresse: string | null;
  } | null;
  utilisateurs?: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string | null;
    date_naissance: string | null;
    role: "administrateur" | "inscrit" | "membre" | null;
  } | null;
}

/** Atelier tel que listé dans l'accordéon (avec ou sans pré-inscription). */
export interface AtelierListe {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  lieu: string | null;
  statut: string;
  tarif_standard: number | null;
  places_max: number;
  places_disponibles: number;
}

export const ROLES_BADGE: Record<string, { label: string; cls: string }> = {
  administrateur: { label: "Admin",   cls: "bg-purple-100 text-purple-700" },
  membre:         { label: "Membre",  cls: "bg-primary/10 text-primary" },
  inscrit:        { label: "Inscrit", cls: "bg-gray-100 text-gray-600" },
};

export const STATUT_BADGE: Record<StatutInscription, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  confirme:   "bg-green-100 text-green-700",
  annule:     "bg-red-100 text-red-700",
};

export const STATUT_LABEL: Record<StatutInscription, string> = {
  en_attente: "En attente",
  confirme:   "Validée",
  annule:     "Refusée",
};
